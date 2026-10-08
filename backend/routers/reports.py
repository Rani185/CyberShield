import json
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from database import get_connection
from models import ReportRequest
from services.score_engine import get_current_score

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _generate_report_data(conn, time_range_hours: int) -> dict:
    cutoff = (datetime.utcnow() - timedelta(hours=time_range_hours)).strftime("%Y-%m-%dT%H:%M:%S")

    events_analyzed = conn.execute(
        "SELECT COUNT(*) as cnt FROM events WHERE timestamp >= ?", (cutoff,)
    ).fetchone()["cnt"]

    alerts = conn.execute(
        "SELECT severity, status FROM alerts WHERE created_at >= ?", (cutoff,)
    ).fetchall()

    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    open_alerts = 0
    resolved_alerts = 0
    for a in alerts:
        sev = (a["severity"] or "").upper()
        if sev in severity_counts:
            severity_counts[sev] += 1
        if a["status"] in ("OPEN", "INVESTIGATING"):
            open_alerts += 1
        elif a["status"] == "RESOLVED":
            resolved_alerts += 1

    # Top threats
    top_threats = conn.execute(
        """
        SELECT rule_id, category, severity, COUNT(*) as count
        FROM alerts
        WHERE created_at >= ?
        GROUP BY rule_id, category, severity
        ORDER BY count DESC
        LIMIT 5
        """,
        (cutoff,),
    ).fetchall()

    # Top IPs
    top_ips = conn.execute(
        """
        SELECT source_ip, COUNT(*) as event_count
        FROM events
        WHERE timestamp >= ? AND source_ip IS NOT NULL
        GROUP BY source_ip
        ORDER BY event_count DESC
        LIMIT 5
        """,
        (cutoff,),
    ).fetchall()

    return {
        "events_analyzed": events_analyzed,
        "total_alerts": len(alerts),
        "severity_counts": severity_counts,
        "security_score": get_current_score(conn),
        "top_threats": [dict(r) for r in top_threats],
        "top_ips": [dict(r) for r in top_ips],
        "open_alerts": open_alerts,
        "resolved_alerts": resolved_alerts,
    }


@router.get("")
def list_reports():
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT r.id, r.report_id, r.generated_at, r.time_range_hours,
                   json_extract(r.data, '$.total_events') as total_events,
                   json_extract(r.data, '$.total_alerts') as total_alerts,
                   json_extract(r.data, '$.security_score') as security_score
            FROM reports r
            ORDER BY r.generated_at DESC
            """
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/{report_id}")
def get_report(report_id: int):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM reports WHERE id = ?", (report_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Report not found")
        result = dict(row)
        # Parse the stored JSON data blob and merge into response
        if result.get("data"):
            try:
                data = json.loads(result["data"])
                result.update(data)
            except Exception:
                pass
        # Rename keys to match frontend expectations
        result["severity_breakdown"] = result.pop("severity_counts", {})
        return result
    finally:
        conn.close()


@router.post("/generate", status_code=201)
def generate_report(body: ReportRequest):
    conn = get_connection()
    try:
        now = datetime.utcnow()
        date_str = now.strftime("%Y%m%d")

        # Sequential report ID for today
        count = conn.execute(
            "SELECT COUNT(*) as cnt FROM reports WHERE generated_at LIKE ?",
            (f"{now.strftime('%Y-%m-%d')}%",),
        ).fetchone()["cnt"]
        report_id = f"RPT-{date_str}-{count + 1:03d}"

        data = _generate_report_data(conn, body.time_range_hours)
        generated_at = now.strftime("%Y-%m-%dT%H:%M:%S")

        conn.execute(
            "INSERT INTO reports (report_id, generated_at, time_range_hours, data) VALUES (?,?,?,?)",
            (report_id, generated_at, body.time_range_hours, json.dumps(data)),
        )
        conn.commit()

        return {
            "report_id": report_id,
            "generated_at": generated_at,
            "time_range_hours": body.time_range_hours,
            **data,
        }
    finally:
        conn.close()
