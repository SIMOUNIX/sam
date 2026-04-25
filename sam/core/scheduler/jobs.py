from datetime import datetime, timedelta

import discord
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from sam.core.memory.structured import get_due_reminders, get_session, Reminder

log = structlog.get_logger()

_TOMORROW_HOUR = 9


def _tomorrow_9am() -> datetime:
    return (datetime.now() + timedelta(days=1)).replace(
        hour=_TOMORROW_HOUR, minute=0, second=0, microsecond=0
    )


async def _check_reminders(bot: discord.Client) -> None:
    if not bot.is_ready():
        log.debug("scheduler skipped — bot not ready")
        return

    due = get_due_reminders()
    log.info("scheduler tick", due_count=len(due))

    for reminder in due:
        try:
            user = await bot.fetch_user(int(reminder.member_discord_id))
            await user.send(
                f"Hey! Just checking in — did you get to this?\n> {reminder.content}\n\n"
                "Reply **yes** if done, **snooze** to push it back 1 hour, or just ignore this and I'll remind you tomorrow."
            )
        except Exception as exc:
            log.error("reminder dispatch failed", reminder_id=reminder.id, error=str(exc))
            continue

        with get_session() as s:
            r = s.query(Reminder).filter_by(id=reminder.id).first()
            if r:
                r.pending_ack = True
                r.due_at = _tomorrow_9am()
        log.info("reminder fired", reminder_id=reminder.id, member=reminder.member_discord_id)


def build_scheduler(bot: discord.Client) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_check_reminders, "interval", minutes=1, args=[bot])
    return scheduler
