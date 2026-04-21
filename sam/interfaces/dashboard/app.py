from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from sam.config.loader import load_config
from sam.core.llm.tools import TOOLS
from sam.core.memory.structured import (
    Episode,
    Event,
    Memory,
    Reminder,
    configure_session,
    get_session,
)
from sam.core.memory.vector import VectorMemory

load_dotenv()

DASHBOARD_DIR = Path(__file__).parent
DIST_DIR = DASHBOARD_DIR / "frontend" / "dist"
VECTOR_PATH = "~/.sam/vector.chroma"
LOG_PATH = Path(os.environ.get("SAM_DATA_DIR", "~/.sam")).expanduser() / "sam.log"
SQLITE_PATH = Path(os.environ.get("SAM_DATA_DIR", "~/.sam")).expanduser() / "sam.db"


def _find_members_path() -> Path:
    cwd_path = Path("config/members.toml")
    if cwd_path.exists():
        return cwd_path
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "config" / "members.toml"
        if candidate.exists():
            return candidate
    return cwd_path


MEMBERS_PATH = _find_members_path()

app = FastAPI(title="SAM Dashboard")

# CORS for Vite dev server on a different port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET"],
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
                ToolSpec(
                    name=fn["name"],
                    description=fn["description"],
                    params=params,
                )
            )
        )
    return out


def _member_lookup() -> dict[str, dict[str, str]]:
    if not MEMBERS_PATH.exists():
        return {}
    config = load_config(MEMBERS_PATH)
    return {
        m.discord_id: {"firstname": m.firstname, "family": f.name}
        for f in config.families
        for m in f.members
    }


def _members_flat() -> list[dict[str, str]]:
    if not MEMBERS_PATH.exists():
        return []
    config = load_config(MEMBERS_PATH)
    return [
        {"family": f.name, "firstname": m.firstname, "discord_id": m.discord_id}
        for f in config.families
        for m in f.members
    ]


def _member_name(lookup: dict[str, dict[str, str]], discord_id: str) -> str:
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


@app.get("/api/state")
async def state() -> JSONResponse:
    lookup = _member_lookup()

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

        memories_payload = [
            {
                "id": m.id,
                "member": _member_name(lookup, m.member_discord_id),
                "content": m.content,
                "at": _iso(m.created_at),
            }
            for m in recent_memories
        ]
        episodes_payload = [
            {
                "id": e.id,
                "member": _member_name(lookup, e.member_discord_id),
                "content": e.content,
                "context": e.context,
                "at": _iso(e.created_at),
            }
            for e in recent_episodes
        ]
        events_payload = [
            {
                "id": v.id,
                "member": _member_name(lookup, v.member_discord_id),
                "title": v.title,
                "description": v.description,
                "start_at": _iso(v.start_at),
                "end_at": _iso(v.end_at),
            }
            for v in upcoming_events
        ]
        reminders_payload = [
            {
                "id": r.id,
                "member": _member_name(lookup, r.member_discord_id),
                "content": r.content,
                "due_at": _iso(r.due_at),
            }
            for r in pending_reminders
        ]

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
        "members": _members_flat(),
        "counts": {
            "memories": memory_count,
            "episodes": episode_count,
            "events": event_count,
            "reminders_total": reminder_count,
            "reminders_pending": pending_count,
            "vector_documents": _vector_count(),
        },
        "recent": {
            "memories": memories_payload,
            "episodes": episodes_payload,
            "events": events_payload,
            "reminders": reminders_payload,
        },
    }
    return JSONResponse(payload)


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


# --- Static React build ---
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
    app.mount(
        "/assets",
        StaticFiles(directory=DIST_DIR / "assets"),
        name="assets",
    )


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
