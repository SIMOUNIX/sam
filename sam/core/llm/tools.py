from datetime import datetime

from sam.core.memory.structured import Event, Memory, get_session


def save_memory(member_discord_id: str, content: str) -> str:
    with get_session() as s:
        s.add(Memory(member_discord_id=member_discord_id, content=content))
    return "memory saved"


def save_event(
    member_discord_id: str, title: str, description: str, start_at: str, end_at: str
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


NAMES_TO_FUNCTIONS = {
    "save_memory": save_memory,
    "save_event": save_event,
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": "Save a fact or preference about a member.",
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
            "name": "save_event",
            "description": "Save an event for member calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "member_discord_id": {"type": "string"},
                    "title": {
                        "type": "string",
                        "description": "The title of the event.",
                    },
                    "description": {
                        "type": "string",
                        "description": "The description of the event.",
                    },
                    "start_at": {
                        "type": "string",
                        "description": "The start time of the event.",
                    },
                    "end_at": {
                        "type": "string",
                        "description": "The end time of the event.",
                    },
                },
                "required": ["member_discord_id", "title", "description", "start_at"],
            },
        },
    },
]
