from typing import Optional, List, Dict, Any
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

class EventOut(BaseModel):
    id: int
    timestamp: str
    event_type: str
    source_ip: Optional[str] = None
    destination: Optional[str] = None
    username: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    message: Optional[str] = None
    status: str = "new"


class EventDetail(EventOut):
    related_alerts: List[Dict[str, Any]] = []


class EventsResponse(BaseModel):
    events: List[EventOut]
    total: int
    page: int
    limit: int


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class AlertOut(BaseModel):
    id: int
    rule_id: Optional[str] = None
    event_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    source_ip: Optional[str] = None
    status: str = "OPEN"
    created_at: Optional[str] = None
    resolved_at: Optional[str] = None


class AlertDetail(AlertOut):
    related_events: List[Dict[str, Any]] = []
    rule_details: Optional[Dict[str, Any]] = None
    recommended_action: Optional[str] = None


class AlertsResponse(BaseModel):
    alerts: List[AlertOut]
    total: int
    page: int
    limit: int


class InvestigateRequest(BaseModel):
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


# ---------------------------------------------------------------------------
# Detection Rules
# ---------------------------------------------------------------------------

class RuleOut(BaseModel):
    id: int
    rule_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    threshold: int = 1
    enabled: int = 1
    created_at: Optional[str] = None


class RuleCreate(BaseModel):
    rule_id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = "MEDIUM"
    threshold: int = 1
    enabled: int = 1


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    threshold: Optional[int] = None
    enabled: Optional[bool] = None

    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        # Convert bool → int for SQLite
        if 'enabled' in data and data['enabled'] is not None:
            data['enabled'] = int(data['enabled'])
        return data


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    security_score: int
    active_alerts: int
    critical_threats: int
    events_analyzed: int
    detection_rules: int
    security_posture: str
    open_alerts: int
    investigating_alerts: int
    resolved_alerts: int


class ThreatActivityPoint(BaseModel):
    hour: str
    events: int
    alerts: int


class ThreatDistributionPoint(BaseModel):
    category: str
    count: int
    percentage: float


# ---------------------------------------------------------------------------
# IP Monitor
# ---------------------------------------------------------------------------

class IPStats(BaseModel):
    ip: str
    total_events: int
    failed_logins: int
    alerts: int
    highest_severity: Optional[str] = None
    risk_score: int
    last_seen: Optional[str] = None


# ---------------------------------------------------------------------------
# Threats
# ---------------------------------------------------------------------------

class ThreatSummary(BaseModel):
    rule_id: Optional[str] = None
    rule_name: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    total_alerts: int
    open_alerts: int
    affected_ips: int


# ---------------------------------------------------------------------------
# Simulator
# ---------------------------------------------------------------------------

class SimulateRequest(BaseModel):
    event_type: str


class SimulateResponse(BaseModel):
    events_created: int
    alerts_created: int
    security_score: int
    message: str


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class ReportRequest(BaseModel):
    time_range_hours: int = 24


class ReportOut(BaseModel):
    report_id: str
    generated_at: str
    time_range_hours: int
    events_analyzed: int
    total_alerts: int
    severity_counts: Dict[str, int]
    security_score: int
    top_threats: List[Dict[str, Any]]
    top_ips: List[Dict[str, Any]]
    open_alerts: int
    resolved_alerts: int
