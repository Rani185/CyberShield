import sys
import os

# Ensure backend/ is on the module search path when running from any cwd
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from database import init_db
from routers import dashboard, events, alerts, threats, ip_monitor, rules, reports, simulator

app = FastAPI(
    title="CyberShield SOC Monitoring API",
    version="1.0.0",
    description="Backend API for the CyberShield Security Operations Center Dashboard",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://[::1]:3000",
        "http://[::1]:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(dashboard.router)
app.include_router(events.router)
app.include_router(alerts.router)
app.include_router(threats.router)
app.include_router(ip_monitor.router)
app.include_router(rules.router)
app.include_router(reports.router)
app.include_router(simulator.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")}
