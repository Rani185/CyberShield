import random
from fastapi import APIRouter, HTTPException
from datetime import datetime
from database import get_connection
from models import SimulateRequest
from services.detection_engine import run_detection
from services.score_engine import recalculate_score, get_current_score

router = APIRouter(prefix="/api/simulate-events", tags=["simulator"])

_CLUSTER_IP = "10.0.0.99"
_USERS = ["admin", "user1", "john.doe", "service_account"]

_TEMPLATES = {
    "normal_login": [
        ("login_success", "Authentication", "LOW", "Successful login by {user} from {ip}"),
    ],
    "failed_login": [
        ("failed_login", "Authentication", "MEDIUM", "Failed login attempt for {user} from {ip}"),
    ],
    "multiple_failed_logins": [
        ("failed_login", "Authentication", "HIGH", "Failed login attempt for admin from {ip}"),
    ] * 6,
    "authz_failure": [
        ("authz_failure", "Access Control", "MEDIUM", "Authorization failure for {user} from {ip}"),
    ],
    "suspicious_network": [
        ("suspicious_network", "Network", "HIGH", "Suspicious network traffic detected from {ip}"),
    ],
    "config_change": [
        ("config_change", "System", "HIGH", "Configuration change by {user} from {ip}"),
    ],
}


@router.post("")
def simulate_events(body: SimulateRequest):
    templates = _TEMPLATES.get(body.event_type)
    if templates is None:
        raise HTTPException(status_code=400, detail=f"Unknown event_type: {body.event_type}")

    conn = get_connection()
    try:
        now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
        user = random.choice(_USERS)
        ip = _CLUSTER_IP
        alerts_created = 0
        events_created = 0

        for event_type, category, severity, msg_tmpl in templates:
            message = msg_tmpl.format(user=user, ip=ip)
            cur = conn.execute(
                """
                INSERT INTO events
                    (timestamp, event_type, source_ip, destination, username, category, severity, message, status)
                VALUES (?,?,?,?,?,?,?,?,'new')
                """,
                (now_ts, event_type, ip, "internal", user, category, severity, message),
            )
            conn.commit()
            events_created += 1

            event_row = conn.execute(
                "SELECT * FROM events WHERE id = ?", (cur.lastrowid,)
            ).fetchone()
            alerts_created += run_detection(conn, event_row)

        score = recalculate_score(conn)

        return {
            "events_created": events_created,
            "alerts_created": alerts_created,
            "security_score": score,
            "message": f"Simulated {body.event_type}: {events_created} event(s), {alerts_created} alert(s) created.",
        }
    finally:
        conn.close()
