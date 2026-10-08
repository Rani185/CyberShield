from fastapi import APIRouter
from database import get_connection

router = APIRouter(prefix="/api/threats", tags=["threats"])


@router.get("")
def list_threats():
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
                a.rule_id,
                dr.name   AS rule_name,
                a.category,
                a.severity,
                COUNT(*)  AS total_alerts,
                SUM(CASE WHEN a.status IN ('OPEN','INVESTIGATING') THEN 1 ELSE 0 END) AS open_alerts,
                COUNT(DISTINCT a.source_ip) AS affected_ips
            FROM alerts a
            LEFT JOIN detection_rules dr ON dr.rule_id = a.rule_id
            GROUP BY a.rule_id, a.category, a.severity
            ORDER BY open_alerts DESC, total_alerts DESC
            """
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
