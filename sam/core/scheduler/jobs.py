from datetime import datetime, timedelta

import discord
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from sam.core.memory.structured import Reminder, get_active_reminders, get_session

log = structlog.get_logger()

_TOMORROW_HOUR = 9


def _tomorrow_9am() -> datetime:
    return (datetime.now() + timedelta(days=1)).replace(
        hour=_TOMORROW_HOUR, minute=0, second=0, microsecond=0
    )


async def _fire_reminder(bot: discord.Client, reminder_id: int) -> None:
    with get_session() as s:
        reminder = s.query(Reminder).filter_by(id=reminder_id).first()
        if not reminder or reminder.done or reminder.pending_ack:
            return
        content = reminder.content
        member_discord_id = reminder.member_discord_id

    try:
        user = await bot.fetch_user(int(member_discord_id))
        await user.send(
            f"Hey! Just checking in — did you get to this?\n> {content}\n\n"
            "Reply **yes** if done, **snooze** to push it back 1 hour, or just ignore this and I'll remind you tomorrow."
        )
    except Exception as exc:
        log.error("reminder dispatch failed", reminder_id=reminder_id, error=str(exc))
        return

    with get_session() as s:
        r = s.query(Reminder).filter_by(id=reminder_id).first()
        if r:
            r.pending_ack = True
            r.due_at = _tomorrow_9am()
    log.info("reminder fired", reminder_id=reminder_id, member=member_discord_id)


def schedule_reminder(
    scheduler: AsyncIOScheduler,
    bot: discord.Client,
    reminder_id: int,
    due_at: datetime,
) -> None:
    run_date = max(due_at, datetime.now() + timedelta(seconds=1))
    scheduler.add_job(
        _fire_reminder,
        trigger="date",
        run_date=run_date,
        args=[bot, reminder_id],
        id=f"reminder_{reminder_id}",
        replace_existing=True,
    )
    log.info("reminder scheduled", reminder_id=reminder_id, run_date=run_date)


def hydrate_reminders(scheduler: AsyncIOScheduler, bot: discord.Client) -> None:
    reminders = get_active_reminders()
    for r in reminders:
        schedule_reminder(scheduler, bot, r.id, r.due_at)
    log.info("reminders hydrated", count=len(reminders))


def build_scheduler() -> AsyncIOScheduler:
    return AsyncIOScheduler()
