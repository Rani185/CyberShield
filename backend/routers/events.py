from fastapi import APIRouter, HTTPException, Query
from database import get_connection

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
def list_events(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    search: str = Query(None),
    severity: str = Query(None),
    category: str = Query(None),
    status: str = Query(None),
):
    conn = get_connection()
    try:
        conditions = []
        params = []
        if search:
            conditions.append("(message LIKE ? OR source_ip LIKE ? OR username LIKE ?)")
            params += [f"%{search}%", f"%{search}%", f"%{search}%"]
        if severity:
            conditions.append("severity = ?")
            params.append(severity)
        if category:
            conditions.append("category = ?")
            params.append(category)
        if status:
            conditions.append("status = ?")
            params.append(status)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        total = conn.execute(
            f"SELECT COUNT(*) as cnt FROM events {where}", params
        ).fetchone()["cnt"]

        offset = (page - 1) * limit
        rows = conn.execute(
            f"SELECT * FROM events {where} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()

        return {
            "events": [dict(r) for r in rows],
            "total": total,
            "page": page,
            "limit": limit,
        }
    finally:
        conn.close()


@router.get("/{event_id}")
def get_event(event_id: int):
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Event not found")
        event = dict(row)
        related = conn.execute(
            "SELECT * FROM alerts WHERE event_id = ?", (event_id,)
        ).fetchall()
        event["related_alerts"] = [dict(r) for r in related]
        return event
    finally:
        conn.close()
