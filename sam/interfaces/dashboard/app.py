from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from sam.core.llm.tools import TOOLS
from sam.core.memory.structured import (
    Channel,
    Episode,
    Event,
    Family,
    Member,
    Memory,
    Reminder,
    Run,
    build_member_lookup,
    configure_session,
    get_all_members_flat,
    get_session,
)
from sam.core.memory.vector import VectorMemory

load_dotenv()

DASHBOARD_DIR = Path(__file__).parent
DIST_DIR = DASHBOARD_DIR / "frontend" / "dist"
VECTOR_PATH = "~/.sam/vector.chroma"
LOG_PATH = Path(os.environ.get("SAM_DATA_DIR", "~/.sam")).expanduser() / "sam.log"
SQLITE_PATH = Path(os.environ.get("SAM_DATA_DIR", "~/.sam")).expanduser() / "sam.db"

app = FastAPI(title="SAM Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

_vector_memory: VectorMemory | None = None


@dataclass
class ToolSpec:
    name: str
    description: str
    params: list[dict[str, Any]]


def _format_tools() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for t in TOOLS:
        fn = t["function"]
        params_schema = fn.get("parameters", {})
        required = set(params_schema.get("required", []))
        props = params_schema.get("properties", {})
        params = [
            {
                "name": name,
                "type": spec.get("type", "?"),
                "required": name in required,
                "description": spec.get("description", ""),
            }
            for name, spec in props.items()
        ]
        out.append(
            asdict(
                ToolSpec(name=fn["name"], description=fn["description"], params=params)
            )
        )
    return out


def _member_name(lookup: dict[str, dict], discord_id: str) -> str:
    entry = lookup.get(discord_id)
    return entry["firstname"] if entry else discord_id


def _vector_count() -> int | None:
    global _vector_memory
    try:
        if _vector_memory is None:
            _vector_memory = VectorMemory(path=VECTOR_PATH)
        return _vector_memory.collection.count()
    except Exception:
        return None


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


@app.on_event("startup")
async def _startup() -> None:
    configure_session()


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------


@app.get("/api/state")
async def state() -> JSONResponse:
    lookup = build_member_lookup()
    members_flat = get_all_members_flat()

    with get_session() as s:
        memory_count = s.query(Memory).count()
        episode_count = s.query(Episode).count()
        event_count = s.query(Event).count()
        reminder_count = s.query(Reminder).count()
        pending_count = s.query(Reminder).filter(Reminder.done.is_(False)).count()

        recent_memories = (
            s.query(Memory).order_by(Memory.created_at.desc()).limit(10).all()
        )
        recent_episodes = (
            s.query(Episode).order_by(Episode.created_at.desc()).limit(10).all()
        )
        upcoming_events = s.query(Event).order_by(Event.start_at).limit(10).all()
        pending_reminders = (
            s.query(Reminder)
            .filter(Reminder.done.is_(False))
            .order_by(Reminder.due_at)
            .limit(10)
            .all()
        )

    payload = {
        "generated_at": datetime.utcnow().isoformat(),
        "models": {
            "llm_provider": os.environ.get("SAM_LLM_PROVIDER", "unset"),
            "llm_model": "mistral-small-2506",
            "embedding_model": "mistral-embed",
            "vector_db": VECTOR_PATH,
            "sqlite_db": str(SQLITE_PATH),
            "mistral_key_configured": bool(os.environ.get("SAM_MISTRAL_API_KEY")),
            "discord_token_configured": bool(os.environ.get("SAM_DISCORD_BOT_TOKEN")),
        },
        "tools": _format_tools(),
        "members": [
            {
                "family": m["family"],
                "firstname": m["firstname"],
                "discord_id": m["channels"].get("discord", ""),
            }
            for m in members_flat
        ],
        "counts": {
            "memories": memory_count,
            "episodes": episode_count,
            "events": event_count,
            "reminders_total": reminder_count,
            "reminders_pending": pending_count,
            "vector_documents": _vector_count(),
        },
        "recent": {
            "memories": [
                {
                    "id": m.id,
                    "member": _member_name(lookup, m.member_discord_id),
                    "content": m.content,
                    "at": _iso(m.created_at),
                }
                for m in recent_memories
            ],
            "episodes": [
                {
                    "id": e.id,
                    "member": _member_name(lookup, e.member_discord_id),
                    "content": e.content,
                    "context": e.context,
                    "at": _iso(e.created_at),
                }
                for e in recent_episodes
            ],
            "events": [
                {
                    "id": v.id,
                    "member": _member_name(lookup, v.member_discord_id),
                    "title": v.title,
                    "description": v.description,
                    "start_at": _iso(v.start_at),
                    "end_at": _iso(v.end_at),
                }
                for v in upcoming_events
            ],
            "reminders": [
                {
                    "id": r.id,
                    "member": _member_name(lookup, r.member_discord_id),
                    "content": r.content,
                    "due_at": _iso(r.due_at),
                }
                for r in pending_reminders
            ],
        },
    }
    return JSONResponse(payload)


# ---------------------------------------------------------------------------
# Members & Families CRUD
# ---------------------------------------------------------------------------


class FamilyCreate(BaseModel):
    name: str


class MemberCreate(BaseModel):
    family_id: int
    firstname: str
    channels: dict[str, str] = {}


@app.get("/api/families")
async def list_families() -> JSONResponse:
    with get_session() as s:
        families = s.query(Family).order_by(Family.name).all()
        return JSONResponse([{"id": f.id, "name": f.name} for f in families])


@app.post("/api/families")
async def create_family(body: FamilyCreate) -> JSONResponse:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    with get_session() as s:
        existing = s.query(Family).filter_by(name=name).first()
        if existing:
            raise HTTPException(status_code=409, detail="family already exists")
        family = Family(name=name)
        s.add(family)
        s.flush()
        return JSONResponse({"id": family.id, "name": family.name}, status_code=201)


@app.get("/api/members")
async def list_members() -> JSONResponse:
    return JSONResponse(get_all_members_flat())


@app.post("/api/members")
async def create_member(body: MemberCreate) -> JSONResponse:
    firstname = body.firstname.strip()
    if not firstname:
        raise HTTPException(status_code=400, detail="firstname is required")
    if not body.channels:
        raise HTTPException(status_code=400, detail="at least one channel is required")

    with get_session() as s:
        family = s.query(Family).filter_by(id=body.family_id).first()
        if not family:
            raise HTTPException(status_code=404, detail="family not found")
        member = Member(family_id=body.family_id, firstname=firstname)
        s.add(member)
        s.flush()
        for platform, platform_id in body.channels.items():
            if platform_id.strip():
                s.add(
                    Channel(
                        member_id=member.id,
                        platform=platform,
                        platform_id=platform_id.strip(),
                    )
                )
        return JSONResponse(
            {"id": member.id, "firstname": member.firstname}, status_code=201
        )


@app.delete("/api/members/{member_id}")
async def delete_member(member_id: int) -> JSONResponse:
    with get_session() as s:
        member = s.query(Member).filter_by(id=member_id).first()
        if not member:
            raise HTTPException(status_code=404, detail="member not found")
        s.query(Channel).filter_by(member_id=member_id).delete()
        s.delete(member)
    return JSONResponse({"ok": True})


# ---------------------------------------------------------------------------
# Logs
# ---------------------------------------------------------------------------


@app.get("/api/logs")
async def logs(tail: int = 80) -> JSONResponse:
    if not LOG_PATH.exists():
        return JSONResponse({"lines": [], "path": str(LOG_PATH), "exists": False})

    tail = max(1, min(tail, 500))
    with LOG_PATH.open("rb") as f:
        f.seek(0, 2)
        size = f.tell()
        chunk = min(size, 64 * 1024)
        f.seek(size - chunk)
        raw = f.read().decode("utf-8", errors="replace")

    lines = [ln for ln in raw.splitlines() if ln.strip()][-tail:]
    parsed: list[dict[str, Any]] = []
    for ln in lines:
        try:
            parsed.append(json.loads(ln))
        except json.JSONDecodeError:
            parsed.append({"level": "info", "msg": ln, "timestamp": None})

    return JSONResponse({"lines": parsed, "path": str(LOG_PATH), "exists": True})


# ---------------------------------------------------------------------------
# Stats & Runs
# ---------------------------------------------------------------------------


@app.get("/api/stats")
async def stats() -> JSONResponse:
    from datetime import timezone
    from sqlalchemy import func

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    with get_session() as s:
        total_runs = s.query(Run).count()
        total_input = s.query(func.sum(Run.input_tokens)).scalar() or 0
        total_output = s.query(func.sum(Run.output_tokens)).scalar() or 0
        total_tools = s.query(func.sum(Run.tool_calls)).scalar() or 0
        total_cost = s.query(func.sum(Run.cost_usd)).scalar() or 0.0
        month_cost = (
            s.query(func.sum(Run.cost_usd))
            .filter(Run.created_at >= month_start)
            .scalar()
            or 0.0
        )

    return JSONResponse(
        {
            "total_runs": total_runs,
            "total_input_tokens": int(total_input),
            "total_output_tokens": int(total_output),
            "total_tool_calls": int(total_tools),
            "total_cost_usd": round(float(total_cost), 6),
            "month_cost_usd": round(float(month_cost), 6),
            "avg_cost_per_run": round(float(total_cost) / total_runs, 6)
            if total_runs
            else 0.0,
        }
    )


@app.get("/api/stats/daily")
async def stats_daily(days: int = 7) -> JSONResponse:
    from datetime import timedelta, timezone
    from sqlalchemy import func

    days = max(1, min(days, 90))
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    result = []
    with get_session() as s:
        for i in range(days - 1, -1, -1):
            day_start = (now - timedelta(days=i)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            day_end = day_start.replace(hour=23, minute=59, second=59)
            label = day_start.strftime("%a")
            runs_q = s.query(Run).filter(
                Run.created_at >= day_start, Run.created_at <= day_end
            )
            count = runs_q.count()
            inp = runs_q.with_entities(func.sum(Run.input_tokens)).scalar() or 0
            out = runs_q.with_entities(func.sum(Run.output_tokens)).scalar() or 0
            cost = runs_q.with_entities(func.sum(Run.cost_usd)).scalar() or 0.0
            result.append(
                {
                    "date": day_start.strftime("%Y-%m-%d"),
                    "label": label,
                    "runs": count,
                    "input_tokens": int(inp),
                    "output_tokens": int(out),
                    "tokens": int(inp) + int(out),
                    "cost_usd": round(float(cost), 6),
                }
            )

    return JSONResponse(result)


@app.get("/api/runs")
async def runs(limit: int = 20) -> JSONResponse:
    limit = max(1, min(limit, 100))
    lookup = build_member_lookup()

    with get_session() as s:
        recent = s.query(Run).order_by(Run.created_at.desc()).limit(limit).all()

    return JSONResponse(
        [
            {
                "id": r.id,
                "member": _member_name(lookup, r.member_discord_id),
                "model": r.model,
                "input_tokens": r.input_tokens,
                "output_tokens": r.output_tokens,
                "tool_calls": r.tool_calls,
                "duration_ms": r.duration_ms,
                "cost_usd": round(r.cost_usd, 6),
                "status": r.status,
                "created_at": _iso(r.created_at),
            }
            for r in recent
        ]
    )


# ---------------------------------------------------------------------------
# Static React build
# ---------------------------------------------------------------------------

_DEV_HINT = (
    "The dashboard UI hasn't been built yet.\n\n"
    "For development, run the Vite dev server:\n"
    "  cd sam/interfaces/dashboard/frontend && bun run dev\n"
    "Then open http://127.0.0.1:5173\n\n"
    "For a built UI served by FastAPI, run:\n"
    "  cd sam/interfaces/dashboard/frontend && bun run build\n"
    "Then reload this page.\n"
)

if (DIST_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str) -> Any:
    if full_path.startswith("api/"):
        return JSONResponse({"detail": "not found"}, status_code=404)
    index = DIST_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return PlainTextResponse(_DEV_HINT, status_code=503)


def start() -> None:
    import uvicorn

    uvicorn.run(
        "sam.interfaces.dashboard.app:app",
        host="127.0.0.1",
        port=8765,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    start()
