from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from database import get_connection
from models import InvestigateRequest
from services.score_engine import recalculate_score

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

_RECOMMENDED_ACTIONS = {
    "AUTH-001": "Block the source IP immediately and force password reset for affected accounts.",
    "AUTH-002": "Review authentication logs and consider temporary account lockout.",
    "NET-001": "Isolate affected system, capture network traffic for forensic analysis.",
    "ACCESS-001": "Review access control policies and audit resource permissions.",
    "SYS-001": "Revert configuration change if unauthorized and audit admin actions.",
    "SEC-001": "Initiate incident response procedure and escalate to security team.",
}


@router.get("")
def list_alerts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    search: str = Query(None),
    severity: str = Query(None),
    category: str = Query(None),
    status: str = Query(None),
):
    conn = get_connection()
    try:
        conditions = []
        params = []
        if search:
            conditions.append("(title LIKE ? OR description LIKE ? OR source_ip LIKE ?)")
            params += [f"%{search}%", f"%{search}%", f"%{search}%"]
        if severity:
            conditions.append("severity = ?")
            params.append(severity)
        if category:
            conditions.append("category = ?")
            params.append(category)
        if status:
            conditions.append("status = ?")
            params.append(status)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        total = conn.execute(
            f"SELECT COUNT(*) as cnt FROM alerts {where}", params
        ).fetchone()["cnt"]

        offset = (page - 1) * limit
        rows = conn.execute(
            f"SELECT * FROM alerts {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()

        return {
            "alerts": [dict(r) for r in rows],
            "total": total,
            "page": page,
            "limit": limit,
        }
    finally:
        conn.close()


@router.get("/{alert_id}")
def get_alert(alert_id: int):
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")
        alert = dict(row)

        # Related events (same source_ip, within 15 min of alert creation)
        related = conn.execute(
            """
            SELECT * FROM events
            WHERE source_ip = ?
            ORDER BY timestamp DESC
            LIMIT 10
            """,
            (alert["source_ip"],),
        ).fetchall()
        alert["related_events"] = [dict(r) for r in related]

        # Rule details
        rule = conn.execute(
            "SELECT * FROM detection_rules WHERE rule_id = ?", (alert["rule_id"],)
        ).fetchone()
        alert["rule_details"] = dict(rule) if rule else None
        alert["recommended_action"] = _RECOMMENDED_ACTIONS.get(alert["rule_id"] or "", None)
        return alert
    finally:
        conn.close()


@router.post("/{alert_id}/investigate")
def investigate_alert(alert_id: int, body: InvestigateRequest):
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")
        now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
        conn.execute(
            "UPDATE alerts SET status = 'INVESTIGATING' WHERE id = ?", (alert_id,)
        )
        conn.execute(
            """
            INSERT INTO investigations (alert_id, status, notes, assigned_to, created_at, updated_at)
            VALUES (?, 'INVESTIGATING', ?, ?, ?, ?)
            """,
            (alert_id, body.notes, body.assigned_to, now, now),
        )
        conn.commit()
        score = recalculate_score(conn)
        return {"status": "INVESTIGATING", "alert_id": alert_id, "security_score": score}
    finally:
        conn.close()


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int):
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")
        now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
        conn.execute(
            "UPDATE alerts SET status = 'RESOLVED', resolved_at = ? WHERE id = ?",
            (now, alert_id),
        )
        conn.commit()
        score = recalculate_score(conn)
        return {"status": "RESOLVED", "alert_id": alert_id, "security_score": score}
    finally:
        conn.close()
