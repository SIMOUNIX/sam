from datetime import datetime, timedelta
from typing import Callable, Optional

import structlog

from sam.core.memory.structured import Episode, Event, Memory, Reminder, get_session
from sam.core.memory.vector import VectorMemory
from sam.core.scheduler.jobs import _tomorrow_9am

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
                    "member_id": {"type": "integer"},
                    "content": {
                        "type": "string",
                        "description": "The fact to remember.",
                    },
                },
                "required": ["member_id", "content"],
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
                    "member_id": {"type": "integer"},
                    "content": {"type": "string", "description": "What happened."},
                    "context": {
                        "type": "string",
                        "description": "Additional context (optional).",
                    },
                },
                "required": ["member_id", "content"],
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
                    "member_id": {"type": "integer"},
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
                "required": ["member_id", "title", "description", "start_at"],
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
                    "member_id": {"type": "integer"},
                    "content": {
                        "type": "string",
                        "description": "What to remind about.",
                    },
                    "due_at": {
                        "type": "string",
                        "description": "ISO 8601 datetime when the reminder fires.",
                    },
                },
                "required": ["member_id", "content", "due_at"],
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
                    "member_id": {"type": "integer"},
                    "query": {
                        "type": "string",
                        "description": "What to look for.",
                    },
                },
                "required": ["member_id", "query"],
            },
        },
    },
]

REMINDER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "complete_reminder",
            "description": "Mark a pending reminder as done because the member confirmed they completed the task.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reminder_id": {"type": "integer"},
                },
                "required": ["reminder_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "snooze_reminder",
            "description": "Snooze a pending reminder for a given number of minutes. Use the duration the member specified, or 60 minutes if unspecified.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reminder_id": {"type": "integer"},
                    "minutes": {
                        "type": "integer",
                        "description": "How many minutes to snooze for.",
                    },
                },
                "required": ["reminder_id", "minutes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "defer_reminder",
            "description": "Defer a pending reminder to tomorrow because the member's message is off-topic or unrelated to the reminder.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reminder_id": {"type": "integer"},
                },
                "required": ["reminder_id"],
            },
        },
    },
]


class ToolRegistry:
    def __init__(
        self,
        vector_memory: VectorMemory,
        schedule_fn: Optional[Callable[[int, datetime], None]] = None,
    ):
        self.vector_memory = vector_memory
        self.schedule_fn = schedule_fn

    def save_memory(self, member_id: int, content: str) -> str:
        with get_session() as s:
            mem = Memory(member_id=member_id, content=content)
            s.add(mem)
            s.flush()
            log.info("memory saved", member=member_id, content=content)
            self.vector_memory.store(mem.id, member_id, "memory", content)
        return "memory saved"

    def save_episode(
        self, member_id: int, content: str, context: str | None = None
    ) -> str:
        with get_session() as s:
            ep = Episode(member_id=member_id, content=content, context=context)
            s.add(ep)
            s.flush()
            log.info("episode saved", member=member_id, content=content)
            self.vector_memory.store(ep.id, member_id, "episode", content)
        return "episode saved"

    def save_event(
        self,
        member_id: int,
        title: str,
        start_at: str,
        description: str,
        end_at: str | None = None,
    ) -> str:
        with get_session() as s:
            s.add(
                Event(
                    member_id=member_id,
                    title=title,
                    description=description,
                    start_at=datetime.fromisoformat(start_at),
                    end_at=datetime.fromisoformat(end_at) if end_at else None,
                )
            )
            log.info("event saved", member=member_id, title=title, start_at=start_at)
        return "event saved"

    def create_reminder(self, member_id: int, content: str, due_at: str) -> str:
        due = datetime.fromisoformat(due_at)
        with get_session() as s:
            reminder = Reminder(member_id=member_id, content=content, due_at=due)
            s.add(reminder)
            s.flush()
            reminder_id = reminder.id
            log.info(
                "reminder created", member=member_id, content=content, due_at=due_at
            )
        if self.schedule_fn:
            self.schedule_fn(reminder_id, due)
        return "reminder created"

    def recall_memories(self, member_id: int, query: str) -> str:
        log.info("recalling memories", member=member_id, query=query)
        results = self.vector_memory.search(member_id, query)
        if not results:
            return "no relevant memories found"
        return "\n".join(f"- {r}" for r in results)

    def complete_reminder(self, reminder_id: int) -> str:
        with get_session() as s:
            r = s.query(Reminder).filter_by(id=reminder_id).first()
            if not r:
                return "reminder not found"
            r.done = True
            r.pending_ack = False
            log.info("reminder completed", reminder_id=reminder_id)
        return "reminder marked done"

    def snooze_reminder(self, reminder_id: int, minutes: int) -> str:
        new_due = datetime.now() + timedelta(minutes=minutes)
        with get_session() as s:
            r = s.query(Reminder).filter_by(id=reminder_id).first()
            if not r:
                return "reminder not found"
            r.due_at = new_due
            r.pending_ack = False
            log.info("reminder snoozed", reminder_id=reminder_id, minutes=minutes)
        if self.schedule_fn:
            self.schedule_fn(reminder_id, new_due)
        return f"reminder snoozed by {minutes} minutes"

    def defer_reminder(self, reminder_id: int) -> str:
        new_due = _tomorrow_9am()
        with get_session() as s:
            r = s.query(Reminder).filter_by(id=reminder_id).first()
            if not r:
                return "reminder not found"
            r.due_at = new_due
            r.pending_ack = False
            log.info("reminder deferred to tomorrow", reminder_id=reminder_id)
        if self.schedule_fn:
            self.schedule_fn(reminder_id, new_due)
        return "reminder deferred to tomorrow"

    @property
    def names_to_functions(self) -> dict[str, Callable[..., str]]:
        return {
            "save_memory": self.save_memory,
            "save_episode": self.save_episode,
            "save_event": self.save_event,
            "create_reminder": self.create_reminder,
            "recall_memories": self.recall_memories,
            "complete_reminder": self.complete_reminder,
            "snooze_reminder": self.snooze_reminder,
            "defer_reminder": self.defer_reminder,
        }
