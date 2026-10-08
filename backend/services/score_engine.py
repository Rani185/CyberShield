"""
Security Score Engine — recalculates the security score from open alerts
and persists a snapshot to security_score_history.
"""
import sqlite3
from datetime import datetime

_DEDUCTIONS = {"CRITICAL": 15, "HIGH": 8, "MEDIUM": 4, "LOW": 1}


def recalculate_score(conn: sqlite3.Connection) -> int:
    """Recompute score from current OPEN + INVESTIGATING alerts, store in history."""
    rows = conn.execute(
        """
        SELECT severity, COUNT(*) as cnt
        FROM alerts
        WHERE status IN ('OPEN', 'INVESTIGATING')
        GROUP BY severity
        """
    ).fetchall()

    deduction = 0
    for row in rows:
        severity = (row["severity"] or "").upper()
        deduction += _DEDUCTIONS.get(severity, 0) * row["cnt"]

    score = max(0, min(100, 100 - deduction))

    conn.execute(
        "INSERT INTO security_score_history (score, recorded_at) VALUES (?,?)",
        (score, datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")),
    )
    conn.commit()
    return score


def get_current_score(conn: sqlite3.Connection) -> int:
    """Return the latest stored score, or 100 if none exists."""
    row = conn.execute(
        "SELECT score FROM security_score_history ORDER BY id DESC LIMIT 1"
    ).fetchone()
    return row["score"] if row else 100
