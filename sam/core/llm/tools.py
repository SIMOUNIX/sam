from datetime import datetime
from typing import Callable

import structlog

from sam.core.memory.structured import Episode, Event, Memory, Reminder, get_session
from sam.core.memory.vector import VectorMemory

log = structlog.get_logger()

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
    {
        "type": "function",
        "function": {
            "name": "recall_memories",
            "description": "Search for memories and episodes relevant to a query about a member.",
            "parameters": {
                "type": "object",
                "properties": {
                    "member_discord_id": {"type": "string"},
                    "query": {
                        "type": "string",
                        "description": "What to look for.",
                    },
                },
                "required": ["member_discord_id", "query"],
            },
        },
    },
]


class ToolRegistry:
    def __init__(self, vector_memory: VectorMemory):
        self.vector_memory = vector_memory

    def save_memory(self, member_discord_id: str, content: str) -> str:
        with get_session() as s:
            mem = Memory(member_discord_id=member_discord_id, content=content)
            s.add(mem)
            s.flush()
            log.info("memory saved", member=member_discord_id, content=content)
            self.vector_memory.store(mem.id, member_discord_id, "memory", content)
        return "memory saved"

    def save_episode(
        self, member_discord_id: str, content: str, context: str | None = None
    ) -> str:
        with get_session() as s:
            ep = Episode(
                member_discord_id=member_discord_id, content=content, context=context
            )
            s.add(ep)
            s.flush()
            log.info("episode saved", member=member_discord_id, content=content)
            self.vector_memory.store(ep.id, member_discord_id, "episode", content)
        return "episode saved"

    def save_event(
        self,
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
            log.info("event saved", member=member_discord_id, title=title, start_at=start_at)
        return "event saved"

    def create_reminder(
        self, member_discord_id: str, content: str, due_at: str
    ) -> str:
        with get_session() as s:
            s.add(
                Reminder(
                    member_discord_id=member_discord_id,
                    content=content,
                    due_at=datetime.fromisoformat(due_at),
                )
            )
            log.info("reminder created", member=member_discord_id, content=content, due_at=due_at)
        return "reminder created"

    def recall_memories(self, member_discord_id: str, query: str) -> str:
        log.info("recalling memories", member=member_discord_id, query=query)
        results = self.vector_memory.search(member_discord_id, query)
        if not results:
            return "no relevant memories found"
        return "\n".join(f"- {r}" for r in results)

    @property
    def names_to_functions(self) -> dict[str, Callable[..., str]]:
        return {
            "save_memory": self.save_memory,
            "save_episode": self.save_episode,
            "save_event": self.save_event,
            "create_reminder": self.create_reminder,
            "recall_memories": self.recall_memories,
        }
