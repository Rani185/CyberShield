# CyberShield – Cybersecurity SOC Monitoring Dashboard

A full-stack, fully dynamic Security Operations Center (SOC) monitoring platform built with **React + Vite** (frontend) and **FastAPI + SQLite** (backend).

---

## Features

- **Real-time Security Score** — auto-calculated from open alerts (Critical −15, High −8, Medium −4, Low −1), clamped 0–100
- **Detection Engine** — 6 rules (AUTH-001, AUTH-002, NET-001, ACCESS-001, SYS-001, SEC-001) evaluated on every event
- **Event Simulator** — safely generate synthetic events to trigger the full alert pipeline
- **Dynamic Dashboard** — all metrics, charts and tables poll from the backend every 8 s
- **Alert Lifecycle** — OPEN → INVESTIGATING (with notes) → RESOLVED, with score recalculation at each step
- **IP Monitor** — per-IP stats and risk scores, calculated from live database data
- **Analytics** — 6 dynamic charts all backed by real API data
- **Reports** — generate, view and export JSON reports for any time range
- **Detection Rules** — enable/disable rules via toggle, add custom rules

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Backend

```bash
cd cybershield/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

On first startup the database is created and seeded with ~36 synthetic events and detection rules. The AUTH-001 rule fires immediately on the seed cluster.

### 2. Frontend

```bash
cd cybershield/frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Docker Compose (Recommended)

```bash
cd cybershield
docker-compose up --build
```

- Frontend → `http://localhost:3000`
- Backend API → `http://localhost:8000`
- API Docs → `http://localhost:8000/docs`

---

## Project Structure

```
cybershield/
├── backend/
│   ├── main.py                   # FastAPI app entrypoint
│   ├── database.py               # SQLite init, schema, seeding
│   ├── models.py                 # Pydantic request/response models
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routers/
│   │   ├── dashboard.py          # /api/dashboard/*
│   │   ├── events.py             # /api/events
│   │   ├── alerts.py             # /api/alerts
│   │   ├── threats.py            # /api/threats
│   │   ├── ip_monitor.py         # /api/ip-monitor
│   │   ├── rules.py              # /api/rules
│   │   ├── reports.py            # /api/reports
│   │   └── simulator.py          # /api/simulate-events
│   ├── services/
│   │   ├── detection_engine.py   # Rule evaluation
│   │   └── score_engine.py       # Security score calculator
│   └── tests/
│       └── test_api.py
├── frontend/
│   ├── src/
│   │   ├── api/                  # Axios API modules
│   │   ├── components/
│   │   │   ├── layout/           # Sidebar, TopNav, Layout
│   │   │   └── ui/               # Card, Badge, Modal, Table, etc.
│   │   ├── hooks/                # usePolling, useDashboard
│   │   └── pages/                # All 10 page components
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## Demo Flow

1. Open the dashboard — observe seeded alerts and security score
2. Click **Simulate** in the top navbar
3. Click **Multiple Failed Logins** — 6 `failed_login` events are created, AUTH-001 fires, a HIGH alert is created, the score drops
4. Navigate to **Alerts** — the new alert appears at the top
5. Click the alert row to open the detail modal
6. Add investigation notes and click **Investigate** — status changes to INVESTIGATING
7. Click **Resolve** — status changes to RESOLVED, score recovers
8. Return to **Dashboard** — the score and alert counts have updated

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard/stats` | Security metrics |
| GET | `/api/dashboard/threat-activity` | 24 h hourly event/alert counts |
| GET | `/api/dashboard/threat-distribution` | Alert categories breakdown |
| GET | `/api/dashboard/system-status` | Service health |
| GET | `/api/dashboard/score-history` | Historical score snapshots |
| GET | `/api/events` | Paginated events (search/filter) |
| GET | `/api/events/{id}` | Single event + related alerts |
| GET | `/api/alerts` | Paginated alerts (search/filter) |
| GET | `/api/alerts/{id}` | Alert detail + rule + recommendation |
| POST | `/api/alerts/{id}/investigate` | Mark alert INVESTIGATING |
| POST | `/api/alerts/{id}/resolve` | Resolve alert |
| GET | `/api/threats` | Threat summaries by rule |
| GET | `/api/ip-monitor` | Per-IP risk stats |
| GET | `/api/rules` | All detection rules |
| POST | `/api/rules` | Create detection rule |
| PUT | `/api/rules/{id}` | Update/toggle rule |
| GET | `/api/reports` | List generated reports |
| GET | `/api/reports/{id}` | Single report detail |
| POST | `/api/reports/generate` | Generate a new report |
| POST | `/api/simulate-events` | Simulate synthetic events |

---

## Detection Rules

| Rule ID | Condition | Severity |
|---------|-----------|----------|
| AUTH-001 | 5+ failed logins from same IP in 5 min | HIGH |
| AUTH-002 | 3+ auth failures from same IP in 10 min | MEDIUM |
| NET-001 | Suspicious network event detected | HIGH |
| ACCESS-001 | 3+ authz failures from same IP in 10 min | MEDIUM |
| SYS-001 | Sensitive configuration change | HIGH |
| SEC-001 | 5+ suspicious events from same IP in 15 min | HIGH |

---

## Running Tests

```bash
cd cybershield/backend
pytest tests/test_api.py -v
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Lucide React, React Router v6 |
| Backend | FastAPI, Uvicorn, Python 3.11 |
| Database | SQLite (via stdlib sqlite3) |
| HTTP Client | Axios |
| Notifications | react-hot-toast |
| Container | Docker, docker-compose |

---

## Security Notes

The Event Simulator generates **synthetic, local-only events**. No real network scanning, exploitation, or probing of external systems ever occurs. All data stays in the local SQLite database.
