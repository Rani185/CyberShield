"""
Integration tests for the CyberShield SOC API.

Run from cybershield/backend/:
    pytest tests/test_api.py -v
"""
import sys
import os
import sqlite3
import pytest

# Ensure backend/ is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ---------------------------------------------------------------------------
# Shared in-memory DB — patched before any app imports so every router
# gets the same connection.  We wrap close() to a no-op so the single
# in-memory connection survives across requests.
# ---------------------------------------------------------------------------

_TEST_CONN: sqlite3.Connection = sqlite3.connect(":memory:", check_same_thread=False)
_TEST_CONN.row_factory = sqlite3.Row
_TEST_CONN.execute("PRAGMA journal_mode=WAL")


class _NoCloseConn:
    """Proxy that delegates everything to the real connection but ignores close()."""
    def __init__(self, conn):
        self._conn = conn

    def close(self):
        pass  # never actually close the in-memory DB

    def __getattr__(self, name):
        return getattr(self._conn, name)


def _get_test_connection():
    return _NoCloseConn(_TEST_CONN)


# Patch database module before importing app
import database
database.get_connection = _get_test_connection

# Now import app (routers will pick up the patched get_connection)
from main import app  # noqa: E402

from fastapi.testclient import TestClient

client = TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Seed fixture — runs once for the whole session
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def seed_db():
    _TEST_CONN.executescript(database._DDL)
    database._seed_rules(_TEST_CONN)
    database._seed_events(_TEST_CONN)
    from services.detection_engine import run_detection_for_all_events
    from services.score_engine import recalculate_score
    run_detection_for_all_events(_TEST_CONN)
    recalculate_score(_TEST_CONN)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "timestamp" in body


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def test_dashboard_stats():
    r = client.get("/api/dashboard/stats")
    assert r.status_code == 200
    body = r.json()
    for key in ("security_score", "active_alerts", "events_analyzed", "detection_rules", "security_posture"):
        assert key in body, f"Missing key: {key}"
    assert 0 <= body["security_score"] <= 100
    assert body["security_posture"] in ("GOOD", "MODERATE", "ELEVATED", "CRITICAL")


def test_threat_activity():
    r = client.get("/api/dashboard/threat-activity")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 24
    assert "hour" in data[0]


def test_threat_distribution():
    r = client.get("/api/dashboard/threat-distribution")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


def test_system_status():
    r = client.get("/api/dashboard/system-status")
    assert r.status_code == 200
    body = r.json()
    assert body["api"] == "healthy"
    assert body["database"] == "healthy"
    assert "detection_engine" in body


def test_score_history():
    r = client.get("/api/dashboard/score-history")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        assert "score" in data[0]
        assert "time" in data[0]


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

def test_list_events():
    r = client.get("/api/events")
    assert r.status_code == 200
    body = r.json()
    assert "events" in body
    assert "total" in body
    assert body["total"] >= 30


def test_list_events_pagination():
    r = client.get("/api/events?page=1&limit=5")
    assert r.status_code == 200
    body = r.json()
    assert len(body["events"]) <= 5


def test_list_events_filter_severity():
    r = client.get("/api/events?severity=HIGH")
    assert r.status_code == 200
    body = r.json()
    for ev in body["events"]:
        assert ev["severity"] == "HIGH"


def test_get_event_not_found():
    r = client.get("/api/events/999999")
    assert r.status_code == 404


def test_get_event():
    r = client.get("/api/events/1")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == 1
    assert "related_alerts" in body


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

def test_list_alerts():
    r = client.get("/api/alerts")
    assert r.status_code == 200
    body = r.json()
    assert "alerts" in body
    assert "total" in body


def test_get_alert_not_found():
    r = client.get("/api/alerts/999999")
    assert r.status_code == 404


def test_get_alert():
    # Get first alert (if any) and fetch its detail
    r = client.get("/api/alerts?limit=1")
    assert r.status_code == 200
    alerts = r.json()["alerts"]
    if not alerts:
        pytest.skip("No alerts seeded")
    alert_id = alerts[0]["id"]
    r2 = client.get(f"/api/alerts/{alert_id}")
    assert r2.status_code == 200
    body = r2.json()
    assert "recommended_action" in body
    assert "related_events" in body


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------

def test_list_rules():
    r = client.get("/api/rules")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 6
    rule_ids = {rule["rule_id"] for rule in data}
    assert "AUTH-001" in rule_ids


def test_create_and_update_rule():
    # Create
    r = client.post("/api/rules", json={
        "rule_id": "TEST-001",
        "name": "Test Rule",
        "severity": "LOW",
        "threshold": 1,
    })
    assert r.status_code == 201
    rule = r.json()
    rule_db_id = rule["id"]
    assert rule["rule_id"] == "TEST-001"

    # Update — disable it (send bool; backend converts to int)
    r2 = client.put(f"/api/rules/{rule_db_id}", json={"enabled": False})
    assert r2.status_code == 200
    assert r2.json()["enabled"] == 0

    # Re-enable
    r3 = client.put(f"/api/rules/{rule_db_id}", json={"enabled": True})
    assert r3.status_code == 200
    assert r3.json()["enabled"] == 1


# ---------------------------------------------------------------------------
# Threats
# ---------------------------------------------------------------------------

def test_list_threats():
    r = client.get("/api/threats")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------------------------------------------------------------------------
# IP Monitor
# ---------------------------------------------------------------------------

def test_ip_monitor():
    r = client.get("/api/ip-monitor")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        for key in ("ip", "total_events", "failed_logins", "alerts", "risk_score"):
            assert key in item, f"Missing key: {key}"
        assert 0 <= item["risk_score"] <= 100


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

def test_generate_and_list_report():
    r = client.post("/api/reports/generate", json={"time_range_hours": 48})
    assert r.status_code == 201
    body = r.json()
    assert "report_id" in body
    assert body["report_id"].startswith("RPT-")
    assert "severity_counts" in body

    r2 = client.get("/api/reports")
    assert r2.status_code == 200
    reports = r2.json()
    assert len(reports) >= 1

    # Fetch single report detail
    report_db_id = reports[0]["id"]
    r3 = client.get(f"/api/reports/{report_db_id}")
    assert r3.status_code == 200
    detail = r3.json()
    assert "severity_breakdown" in detail


# ---------------------------------------------------------------------------
# Simulator — full end-to-end flow
# ---------------------------------------------------------------------------

def test_simulate_normal_login():
    r = client.post("/api/simulate-events", json={"event_type": "normal_login"})
    assert r.status_code == 200
    body = r.json()
    assert body["events_created"] == 1


def test_simulate_unknown_type():
    r = client.post("/api/simulate-events", json={"event_type": "unicorn"})
    assert r.status_code == 400


def test_simulate_multiple_failed_logins_creates_alert():
    """Core end-to-end: multiple_failed_logins → AUTH-001 alert → score drops."""
    stats_before = client.get("/api/dashboard/stats").json()
    score_before = stats_before["security_score"]

    r = client.post("/api/simulate-events", json={"event_type": "multiple_failed_logins"})
    assert r.status_code == 200
    body = r.json()
    assert body["events_created"] == 6
    assert body["alerts_created"] >= 1
    assert body["security_score"] <= score_before  # score should drop or stay same


def test_resolve_alert_increases_score():
    """Resolve the most recent OPEN alert and confirm score goes up."""
    alerts_resp = client.get("/api/alerts?status=OPEN&limit=1").json()
    if not alerts_resp.get("alerts"):
        pytest.skip("No open alerts available")

    alert_id = alerts_resp["alerts"][0]["id"]

    stats_before = client.get("/api/dashboard/stats").json()
    score_before = stats_before["security_score"]

    r = client.post(f"/api/alerts/{alert_id}/resolve")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "RESOLVED"
    assert body["security_score"] >= score_before


def test_investigate_alert():
    """Set alert to INVESTIGATING with notes."""
    alerts_resp = client.get("/api/alerts?status=OPEN&limit=1").json()
    if not alerts_resp.get("alerts"):
        pytest.skip("No open alerts available")

    alert_id = alerts_resp["alerts"][0]["id"]
    r = client.post(f"/api/alerts/{alert_id}/investigate", json={
        "notes": "Reviewing suspicious activity from test suite",
        "assigned_to": "analyst1",
    })
    assert r.status_code == 200
    assert r.json()["status"] == "INVESTIGATING"
