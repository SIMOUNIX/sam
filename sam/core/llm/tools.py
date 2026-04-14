from datetime import datetime

from sam.core.memory.structured import Episode, Event, Memory, Reminder, get_session


def save_memory(member_discord_id: str, content: str) -> str:
    with get_session() as s:
        s.add(Memory(member_discord_id=member_discord_id, content=content))
    return "memory saved"


def save_episode(
    member_discord_id: str, content: str, context: str | None = None
) -> str:
    with get_session() as s:
        s.add(
            Episode(
                member_discord_id=member_discord_id, content=content, context=context
            )
        )
    return "episode saved"


def save_event(
    member_discord_id: str,
    title: str,
    start_at: str,
    description: str,
    end_at: str | None = None,
) -> str:
    with get_session() as s:
        s.add(
            Event(
                member_discord_id=member_discord_id,
                title=title,
                description=description,
                start_at=datetime.fromisoformat(start_at),
                end_at=datetime.fromisoformat(end_at) if end_at else None,
            )
        )
    return "event saved"


def create_reminder(member_discord_id: str, content: str, due_at: str) -> str:
    with get_session() as s:
        s.add(
            Reminder(
                member_discord_id=member_discord_id,
                content=content,
                due_at=datetime.fromisoformat(due_at),
            )
        )
    return "reminder created"


NAMES_TO_FUNCTIONS = {
    "save_memory": save_memory,
    "save_episode": save_episode,
    "save_event": save_event,
    "create_reminder": create_reminder,
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": "Save a persistent fact, preference, or habit about a member.",
            "parameters": {
                "type": "object",
                "properties": {
                    "member_discord_id": {"type": "string"},
                    "content": {
                        "type": "string",
                        "description": "The fact to remember.",
                    },
                },
                "required": ["member_discord_id", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_episode",
            "description": "Save a specific past interaction or event that happened involving a member.",
            "parameters": {
                "type": "object",
                "properties": {
                    "member_discord_id": {"type": "string"},
                    "content": {"type": "string", "description": "What happened."},
                    "context": {
                        "type": "string",
                        "description": "Additional context (optional).",
                    },
                },
                "required": ["member_discord_id", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_event",
            "description": "Save a calendar event for a member.",
            "parameters": {
                "type": "object",
                "properties": {
                    "member_discord_id": {"type": "string"},
                    "title": {"type": "string"},
                    "description": {
                        "type": "string",
                        "description": "Optional description.",
                    },
                    "start_at": {
                        "type": "string",
                        "description": "ISO 8601 datetime, e.g. 2026-04-14T09:00:00.",
                    },
                    "end_at": {
                        "type": "string",
                        "description": "ISO 8601 datetime (optional).",
                    },
                },
                "required": ["member_discord_id", "title", "description", "start_at"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_reminder",
            "description": "Create a reminder for a member at a specific time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "member_discord_id": {"type": "string"},
                    "content": {
                        "type": "string",
                        "description": "What to remind about.",
                    },
                    "due_at": {
                        "type": "string",
                        "description": "ISO 8601 datetime when the reminder fires.",
                    },
                },
                "required": ["member_discord_id", "content", "due_at"],
            },
        },
    },
]
