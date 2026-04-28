from datetime import datetime, timedelta

import discord
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from sam.core.memory.structured import (
    Event,
    Reminder,
    get_active_reminders,
    get_platform_id,
    get_session,
)

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
        member_id = reminder.member_id

    discord_id = get_platform_id(member_id, "discord")
    if not discord_id:
        log.error(
            "no discord channel for member",
            member_id=member_id,
            reminder_id=reminder_id,
        )
        return

    try:
        user = await bot.fetch_user(int(discord_id))
        embed = discord.Embed(
            title="⏰ Reminder",
            description=content,
            color=0xF4A732,
        )
        embed.set_footer(text="✅ done  ·  ❌ remove  ·  reply 2m / 2h / 2d to snooze")
        msg = await user.send(embed=embed)
        await msg.add_reaction("✅")
        await msg.add_reaction("❌")
    except Exception as exc:
        log.error("reminder dispatch failed", reminder_id=reminder_id, error=str(exc))
        return

    with get_session() as s:
        r = s.query(Reminder).filter_by(id=reminder_id).first()
        if r:
            r.pending_ack = True
            r.due_at = _tomorrow_9am()
            r.discord_message_id = str(msg.id)
    log.info("reminder fired", reminder_id=reminder_id, member_id=member_id)


_WARNING_MINUTES = 15


async def _fire_event_warning(bot: discord.Client, event_id: int) -> None:
    with get_session() as s:
        event = s.query(Event).filter_by(id=event_id).first()
        if not event:
            return
        title = event.title
        description = event.description
        start_at = event.start_at
        member_id = event.member_id

    discord_id = get_platform_id(member_id, "discord")
    if not discord_id:
        log.error(
            "no discord channel for member", member_id=member_id, event_id=event_id
        )
        return

    try:
        user = await bot.fetch_user(int(discord_id))
        embed = discord.Embed(
            title=f"📅 {title}",
            description=description or "",
            color=0x5865F2,
        )
        embed.set_footer(text=f"Starting at {start_at.strftime('%H:%M')}")
        await user.send(embed=embed)
        log.info("event warning fired", event_id=event_id, member_id=member_id)
    except Exception as exc:
        log.error("event warning dispatch failed", event_id=event_id, error=str(exc))


def schedule_event_warning(
    scheduler: AsyncIOScheduler,
    bot: discord.Client,
    event_id: int,
    start_at: datetime,
) -> None:
    warn_at = start_at - timedelta(minutes=_WARNING_MINUTES)
    if warn_at <= datetime.now():
        log.debug("event warning skipped — already past", event_id=event_id)
        return
    scheduler.add_job(
        _fire_event_warning,
        trigger="date",
        run_date=warn_at,
        args=[bot, event_id],
        id=f"event_{event_id}",
        replace_existing=True,
    )
    log.info("event warning scheduled", event_id=event_id, warn_at=warn_at)


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
