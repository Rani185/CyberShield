from fastapi import APIRouter
from datetime import datetime, timedelta
from database import get_connection
from services.score_engine import get_current_score

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats():
    conn = get_connection()
    try:
        score = get_current_score(conn)

        alerts = conn.execute("SELECT status, severity FROM alerts").fetchall()
        open_count = sum(1 for a in alerts if a["status"] == "OPEN")
        investigating_count = sum(1 for a in alerts if a["status"] == "INVESTIGATING")
        resolved_count = sum(1 for a in alerts if a["status"] == "RESOLVED")
        active_alerts = open_count + investigating_count
        critical_threats = sum(
            1 for a in alerts
            if (a["severity"] or "").upper() == "CRITICAL" and a["status"] in ("OPEN", "INVESTIGATING")
        )

        events_analyzed = conn.execute("SELECT COUNT(*) as cnt FROM events").fetchone()["cnt"]
        rules_count = conn.execute("SELECT COUNT(*) as cnt FROM detection_rules").fetchone()["cnt"]

        if score >= 80:
            posture = "GOOD"
        elif score >= 60:
            posture = "MODERATE"
        elif score >= 40:
            posture = "ELEVATED"
        else:
            posture = "CRITICAL"

        return {
            "security_score": score,
            "active_alerts": active_alerts,
            "critical_threats": critical_threats,
            "events_analyzed": events_analyzed,
            "detection_rules": rules_count,
            "security_posture": posture,
            "open_alerts": open_count,
            "investigating_alerts": investigating_count,
            "resolved_alerts": resolved_count,
        }
    finally:
        conn.close()


@router.get("/threat-activity")
def threat_activity():
    conn = get_connection()
    try:
        now = datetime.utcnow()
        result = []
        for i in range(23, -1, -1):
            hour_start = now - timedelta(hours=i + 1)
            hour_end = now - timedelta(hours=i)
            hs = hour_start.strftime("%Y-%m-%dT%H:%M:%S")
            he = hour_end.strftime("%Y-%m-%dT%H:%M:%S")

            ev = conn.execute(
                "SELECT COUNT(*) as cnt FROM events WHERE timestamp >= ? AND timestamp < ?",
                (hs, he),
            ).fetchone()["cnt"]
            al = conn.execute(
                "SELECT COUNT(*) as cnt FROM alerts WHERE created_at >= ? AND created_at < ?",
                (hs, he),
            ).fetchone()["cnt"]
            result.append({"hour": hour_end.strftime("%H:%M"), "events": ev, "alerts": al})
        return result
    finally:
        conn.close()


@router.get("/threat-distribution")
def threat_distribution():
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT category, COUNT(*) as cnt
            FROM alerts
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY cnt DESC
            """
        ).fetchall()
        total = sum(r["cnt"] for r in rows)
        result = []
        for r in rows:
            pct = round((r["cnt"] / total * 100), 1) if total else 0.0
            result.append({"category": r["category"], "count": r["cnt"], "percentage": pct})
        return result
    finally:
        conn.close()


@router.get("/system-status")
def system_status():
    conn = get_connection()
    try:
        conn.execute("SELECT 1").fetchone()
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    finally:
        conn.close()

    return {
        "api": "healthy",
        "database": db_status,
        "detection_engine": "running",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
    }


@router.get("/score-history")
def score_history():
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT score, recorded_at FROM security_score_history ORDER BY id DESC LIMIT 50"
        ).fetchall()
        # Return oldest-first for charting
        return [{"score": r["score"], "time": r["recorded_at"]} for r in reversed(rows)]
    finally:
        conn.close()
