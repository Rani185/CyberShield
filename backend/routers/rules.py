from fastapi import APIRouter, HTTPException
from datetime import datetime
from database import get_connection
from models import RuleCreate, RuleUpdate

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.get("")
def list_rules():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM detection_rules ORDER BY id").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.post("", status_code=201)
def create_rule(body: RuleCreate):
    conn = get_connection()
    try:
        now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
        try:
            cur = conn.execute(
                """
                INSERT INTO detection_rules
                    (rule_id, name, description, category, severity, threshold, enabled, created_at)
                VALUES (?,?,?,?,?,?,?,?)
                """,
                (
                    body.rule_id, body.name, body.description, body.category,
                    body.severity, body.threshold, body.enabled, now,
                ),
            )
            conn.commit()
        except Exception:
            raise HTTPException(status_code=409, detail="Rule ID already exists")
        row = conn.execute(
            "SELECT * FROM detection_rules WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


@router.put("/{rule_id}")
def update_rule(rule_id: int, body: RuleUpdate):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM detection_rules WHERE id = ?", (rule_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Rule not found")

        fields = body.model_dump(exclude_none=True)
        if not fields:
            return dict(row)

        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [rule_id]
        conn.execute(f"UPDATE detection_rules SET {set_clause} WHERE id = ?", values)
        conn.commit()
        updated = conn.execute(
            "SELECT * FROM detection_rules WHERE id = ?", (rule_id,)
        ).fetchone()
        return dict(updated)
    finally:
        conn.close()
