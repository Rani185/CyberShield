from fastapi import APIRouter
from database import get_connection

router = APIRouter(prefix="/api/ip-monitor", tags=["ip_monitor"])

_SEV_ORDER = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
_RISK_WEIGHTS = {"CRITICAL": 20, "HIGH": 10, "MEDIUM": 5, "LOW": 2}


@router.get("")
def ip_monitor():
    conn = get_connection()
    try:
        # All IPs from events
        ip_rows = conn.execute(
            "SELECT DISTINCT source_ip FROM events WHERE source_ip IS NOT NULL"
        ).fetchall()

        result = []
        for ip_row in ip_rows:
            ip = ip_row["source_ip"]

            total_events = conn.execute(
                "SELECT COUNT(*) as cnt FROM events WHERE source_ip = ?", (ip,)
            ).fetchone()["cnt"]

            failed_logins = conn.execute(
                "SELECT COUNT(*) as cnt FROM events WHERE source_ip = ? AND event_type = 'failed_login'",
                (ip,),
            ).fetchone()["cnt"]

            last_seen = conn.execute(
                "SELECT MAX(timestamp) as ts FROM events WHERE source_ip = ?", (ip,)
            ).fetchone()["ts"]

            alert_rows = conn.execute(
                "SELECT severity, status FROM alerts WHERE source_ip = ?", (ip,)
            ).fetchall()
            alert_count = len(alert_rows)

            # highest severity
            highest_sev = None
            for ar in alert_rows:
                sev = (ar["severity"] or "").upper()
                if highest_sev is None or _SEV_ORDER.get(sev, 0) > _SEV_ORDER.get(highest_sev, 0):
                    highest_sev = sev

            # risk score
            risk = failed_logins  # +1 per failed login
            for ar in alert_rows:
                sev = (ar["severity"] or "").upper()
                risk += _RISK_WEIGHTS.get(sev, 0)
            risk = min(100, risk)

            result.append({
                "ip": ip,
                "total_events": total_events,
                "failed_logins": failed_logins,
                "alerts": alert_count,
                "highest_severity": highest_sev,
                "risk_score": risk,
                "last_seen": last_seen,
            })

        result.sort(key=lambda x: x["risk_score"], reverse=True)
        return result
    finally:
        conn.close()
