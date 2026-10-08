import sqlite3
import os
from datetime import datetime, timedelta
import random

DB_PATH = os.environ.get("DB_PATH", "cybershield.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

_DDL = """
CREATE TABLE IF NOT EXISTS events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    source_ip       TEXT,
    destination     TEXT,
    username        TEXT,
    category        TEXT,
    severity        TEXT,
    message         TEXT,
    status          TEXT DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id         TEXT,
    event_id        INTEGER,
    title           TEXT,
    description     TEXT,
    category        TEXT,
    severity        TEXT,
    source_ip       TEXT,
    status          TEXT DEFAULT 'OPEN',
    created_at      TEXT,
    resolved_at     TEXT
);

CREATE TABLE IF NOT EXISTS detection_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id     TEXT UNIQUE,
    name        TEXT,
    description TEXT,
    category    TEXT,
    severity    TEXT,
    threshold   INTEGER DEFAULT 1,
    enabled     INTEGER DEFAULT 1,
    created_at  TEXT
);

CREATE TABLE IF NOT EXISTS investigations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id    INTEGER,
    status      TEXT,
    notes       TEXT,
    assigned_to TEXT,
    created_at  TEXT,
    updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS security_score_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    score       INTEGER,
    recorded_at TEXT
);

CREATE TABLE IF NOT EXISTS reports (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id       TEXT UNIQUE,
    generated_at    TEXT,
    time_range_hours INTEGER,
    data            TEXT
);
"""

# ---------------------------------------------------------------------------
# Seed detection rules
# ---------------------------------------------------------------------------

_RULES = [
    ("AUTH-001", "Brute Force Login", "5+ failed logins from same IP within 5 minutes", "Authentication", "HIGH", 5),
    ("AUTH-002", "Repeated Auth Failures", "3+ authentication failures in 10 minutes", "Authentication", "MEDIUM", 3),
    ("NET-001", "Suspicious Network Pattern", "Suspicious network pattern detected", "Network", "HIGH", 1),
    ("ACCESS-001", "Repeated Authz Failures", "3+ authorization failures in 10 minutes", "Access Control", "MEDIUM", 3),
    ("SYS-001", "Sensitive Config Change", "Sensitive configuration change detected", "System", "HIGH", 1),
    ("SEC-001", "High Suspicious Activity", "5+ suspicious events in 15 minutes from same IP", "Security", "HIGH", 5),
]


def _seed_rules(conn: sqlite3.Connection) -> None:
    now = datetime.utcnow().isoformat()
    for rule_id, name, desc, category, severity, threshold in _RULES:
        conn.execute(
            """
            INSERT OR IGNORE INTO detection_rules
                (rule_id, name, description, category, severity, threshold, enabled, created_at)
            VALUES (?,?,?,?,?,?,1,?)
            """,
            (rule_id, name, desc, category, severity, threshold, now),
        )
    conn.commit()


# ---------------------------------------------------------------------------
# Seed sample events
# ---------------------------------------------------------------------------

_SAMPLE_IPS = [
    "192.168.1.45", "192.168.1.101", "192.168.1.22",
    "10.0.0.5", "10.0.0.12",
    "172.16.0.33", "172.16.0.77",
    "203.0.113.50",
]

_SAMPLE_USERS = ["admin", "user1", "john.doe", "service_account", "alice", "bob"]

_EVENT_TEMPLATES = [
    # (event_type, category, severity, message_template)
    ("login_success", "Authentication", "LOW", "Successful login by {user} from {ip}"),
    ("login_success", "Authentication", "LOW", "User {user} authenticated from {ip}"),
    ("failed_login", "Authentication", "MEDIUM", "Failed login attempt for {user} from {ip}"),
    ("failed_login", "Authentication", "MEDIUM", "Invalid credentials for {user} from {ip}"),
    ("failed_login", "Authentication", "HIGH", "Multiple failed logins for {user} from {ip}"),
    ("auth_failure", "Authentication", "MEDIUM", "Authentication failure for {user} from {ip}"),
    ("authz_failure", "Access Control", "MEDIUM", "Authorization failure: {user} denied access from {ip}"),
    ("suspicious_network", "Network", "HIGH", "Suspicious network traffic detected from {ip}"),
    ("config_change", "System", "HIGH", "Configuration change detected by {user} from {ip}"),
    ("file_access", "Data", "LOW", "File accessed by {user} from {ip}"),
    ("privilege_escalation", "Security", "HIGH", "Privilege escalation attempt by {user} from {ip}"),
    ("port_scan", "Network", "MEDIUM", "Port scan detected from {ip}"),
]


def _seed_events(conn: sqlite3.Connection) -> None:
    now = datetime.utcnow()
    events = []

    # Spread ~30 events over the last 48 hours
    random.seed(42)
    for i in range(30):
        template = random.choice(_EVENT_TEMPLATES)
        event_type, category, severity, msg_tmpl = template
        ip = random.choice(_SAMPLE_IPS)
        user = random.choice(_SAMPLE_USERS)
        hours_ago = random.uniform(0, 48)
        ts = (now - timedelta(hours=hours_ago)).strftime("%Y-%m-%dT%H:%M:%S")
        message = msg_tmpl.format(user=user, ip=ip)
        events.append((ts, event_type, ip, "internal", user, category, severity, message, "new"))

    # Add a cluster of failed_logins from a single IP to seed an alert
    cluster_ip = "192.168.1.45"
    cluster_ts = (now - timedelta(minutes=3)).strftime("%Y-%m-%dT%H:%M:%S")
    for j in range(6):
        ts = (now - timedelta(minutes=3, seconds=j * 20)).strftime("%Y-%m-%dT%H:%M:%S")
        events.append((
            ts, "failed_login", cluster_ip, "internal", "admin",
            "Authentication", "HIGH",
            f"Failed login attempt for admin from {cluster_ip}", "new",
        ))

    conn.executemany(
        """
        INSERT INTO events
            (timestamp, event_type, source_ip, destination, username, category, severity, message, status)
        VALUES (?,?,?,?,?,?,?,?,?)
        """,
        events,
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Public init
# ---------------------------------------------------------------------------

def init_db() -> None:
    """Create schema, seed rules, and optionally seed sample data."""
    conn = get_connection()
    try:
        conn.executescript(_DDL)
        _seed_rules(conn)

        row = conn.execute("SELECT COUNT(*) as cnt FROM events").fetchone()
        if row["cnt"] == 0:
            _seed_events(conn)
            # Run detection and score on seeded data
            from services.detection_engine import run_detection_for_all_events
            from services.score_engine import recalculate_score
            run_detection_for_all_events(conn)
            recalculate_score(conn)
    finally:
        conn.close()
