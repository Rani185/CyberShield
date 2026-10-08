"""
Detection Engine — evaluates rules against newly inserted events and
creates alerts when thresholds are breached.
"""
import sqlite3
from datetime import datetime, timedelta
from typing import Optional


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")


def _rule_enabled(conn: sqlite3.Connection, rule_id: str) -> bool:
    row = conn.execute(
        "SELECT enabled FROM detection_rules WHERE rule_id = ?", (rule_id,)
    ).fetchone()
    return bool(row and row["enabled"])


def _duplicate_alert_exists(
    conn: sqlite3.Connection,
    rule_id: str,
    source_ip: Optional[str],
    minutes: int = 10,
) -> bool:
    """Return True if an OPEN or INVESTIGATING alert for this rule+IP exists
    within the last *minutes* minutes."""
    cutoff = (datetime.utcnow() - timedelta(minutes=minutes)).strftime("%Y-%m-%dT%H:%M:%S")
    row = conn.execute(
        """
        SELECT COUNT(*) as cnt FROM alerts
        WHERE rule_id = ?
          AND source_ip = ?
          AND status IN ('OPEN', 'INVESTIGATING')
          AND created_at >= ?
        """,
        (rule_id, source_ip, cutoff),
    ).fetchone()
    return row["cnt"] > 0


def _create_alert(
    conn: sqlite3.Connection,
    rule_id: str,
    event_id: Optional[int],
    title: str,
    description: str,
    category: str,
    severity: str,
    source_ip: Optional[str],
) -> int:
    now = _now_iso()
    cur = conn.execute(
        """
        INSERT INTO alerts
            (rule_id, event_id, title, description, category, severity, source_ip, status, created_at)
        VALUES (?,?,?,?,?,?,?,'OPEN',?)
        """,
        (rule_id, event_id, title, description, category, severity, source_ip, now),
    )
    conn.commit()
    return cur.lastrowid


# ---------------------------------------------------------------------------
# Individual rule checks
# ---------------------------------------------------------------------------

def _check_auth001(conn: sqlite3.Connection, event: sqlite3.Row) -> int:
    """AUTH-001: 5+ failed_login from same IP in last 5 min → HIGH."""
    if not _rule_enabled(conn, "AUTH-001"):
        return 0
    source_ip = event["source_ip"]
    cutoff = (datetime.utcnow() - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%S")
    row = conn.execute(
        """
        SELECT COUNT(*) as cnt FROM events
        WHERE event_type = 'failed_login'
          AND source_ip = ?
          AND timestamp >= ?
        """,
        (source_ip, cutoff),
    ).fetchone()
    if row["cnt"] >= 5 and not _duplicate_alert_exists(conn, "AUTH-001", source_ip, 10):
        _create_alert(
            conn, "AUTH-001", event["id"],
            "Brute Force Login Detected",
            f"{row['cnt']} failed login attempts from {source_ip} in the last 5 minutes",
            "Authentication", "HIGH", source_ip,
        )
        return 1
    return 0


def _check_auth002(conn: sqlite3.Connection, event: sqlite3.Row) -> int:
    """AUTH-002: 3+ auth_failure from same IP in last 10 min → MEDIUM."""
    if not _rule_enabled(conn, "AUTH-002"):
        return 0
    source_ip = event["source_ip"]
    cutoff = (datetime.utcnow() - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S")
    row = conn.execute(
        """
        SELECT COUNT(*) as cnt FROM events
        WHERE event_type = 'auth_failure'
          AND source_ip = ?
          AND timestamp >= ?
        """,
        (source_ip, cutoff),
    ).fetchone()
    if row["cnt"] >= 3 and not _duplicate_alert_exists(conn, "AUTH-002", source_ip, 10):
        _create_alert(
            conn, "AUTH-002", event["id"],
            "Repeated Authentication Failures",
            f"{row['cnt']} authentication failures from {source_ip} in the last 10 minutes",
            "Authentication", "MEDIUM", source_ip,
        )
        return 1
    return 0


def _check_net001(conn: sqlite3.Connection, event: sqlite3.Row) -> int:
    """NET-001: suspicious_network event → HIGH."""
    if event["event_type"] != "suspicious_network":
        return 0
    if not _rule_enabled(conn, "NET-001"):
        return 0
    source_ip = event["source_ip"]
    if not _duplicate_alert_exists(conn, "NET-001", source_ip, 10):
        _create_alert(
            conn, "NET-001", event["id"],
            "Suspicious Network Pattern Detected",
            f"Suspicious network traffic detected from {source_ip}",
            "Network", "HIGH", source_ip,
        )
        return 1
    return 0


def _check_access001(conn: sqlite3.Connection, event: sqlite3.Row) -> int:
    """ACCESS-001: 3+ authz_failure from same IP in last 10 min → MEDIUM."""
    if not _rule_enabled(conn, "ACCESS-001"):
        return 0
    source_ip = event["source_ip"]
    cutoff = (datetime.utcnow() - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S")
    row = conn.execute(
        """
        SELECT COUNT(*) as cnt FROM events
        WHERE event_type = 'authz_failure'
          AND source_ip = ?
          AND timestamp >= ?
        """,
        (source_ip, cutoff),
    ).fetchone()
    if row["cnt"] >= 3 and not _duplicate_alert_exists(conn, "ACCESS-001", source_ip, 10):
        _create_alert(
            conn, "ACCESS-001", event["id"],
            "Repeated Authorization Failures",
            f"{row['cnt']} authorization failures from {source_ip} in the last 10 minutes",
            "Access Control", "MEDIUM", source_ip,
        )
        return 1
    return 0


def _check_sys001(conn: sqlite3.Connection, event: sqlite3.Row) -> int:
    """SYS-001: config_change event → HIGH."""
    if event["event_type"] != "config_change":
        return 0
    if not _rule_enabled(conn, "SYS-001"):
        return 0
    source_ip = event["source_ip"]
    if not _duplicate_alert_exists(conn, "SYS-001", source_ip, 10):
        _create_alert(
            conn, "SYS-001", event["id"],
            "Sensitive Configuration Change",
            f"Configuration change detected from {source_ip} by {event['username']}",
            "System", "HIGH", source_ip,
        )
        return 1
    return 0


def _check_sec001(conn: sqlite3.Connection, event: sqlite3.Row) -> int:
    """SEC-001: 5+ suspicious events (failed_login, suspicious_network, authz_failure)
    from same IP in last 15 min → HIGH."""
    if not _rule_enabled(conn, "SEC-001"):
        return 0
    source_ip = event["source_ip"]
    cutoff = (datetime.utcnow() - timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%S")
    row = conn.execute(
        """
        SELECT COUNT(*) as cnt FROM events
        WHERE event_type IN ('failed_login', 'suspicious_network', 'authz_failure')
          AND source_ip = ?
          AND timestamp >= ?
        """,
        (source_ip, cutoff),
    ).fetchone()
    if row["cnt"] >= 5 and not _duplicate_alert_exists(conn, "SEC-001", source_ip, 10):
        _create_alert(
            conn, "SEC-001", event["id"],
            "High Suspicious Activity Volume",
            f"{row['cnt']} suspicious events from {source_ip} in the last 15 minutes",
            "Security", "HIGH", source_ip,
        )
        return 1
    return 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_detection(conn: sqlite3.Connection, event: sqlite3.Row) -> int:
    """Run all rules for a single event. Returns number of new alerts created."""
    created = 0
    created += _check_auth001(conn, event)
    created += _check_auth002(conn, event)
    created += _check_net001(conn, event)
    created += _check_access001(conn, event)
    created += _check_sys001(conn, event)
    created += _check_sec001(conn, event)
    return created


def run_detection_for_all_events(conn: sqlite3.Connection) -> int:
    """Run detection across all stored events (used during seed)."""
    rows = conn.execute("SELECT * FROM events ORDER BY timestamp ASC").fetchall()
    total = 0
    for row in rows:
        total += run_detection(conn, row)
    return total
