import asyncio
import os
import re
from datetime import datetime, timedelta

import discord
import structlog
from dotenv import load_dotenv

from sam.core.llm.conversation import ConversationManager
from sam.core.memory.structured import (
    Reminder,
    get_member_by_channel,
    get_reminder_by_message_id,
    get_session,
)

load_dotenv()
logger = structlog.get_logger()

_SNOOZE_RE = re.compile(r"^\s*(\d+)\s*(m|h|d)\s*$", re.IGNORECASE)


def _parse_snooze_minutes(text: str) -> int | None:
    match = _SNOOZE_RE.match(text.strip())
    if not match:
        return None
    value, unit = int(match.group(1)), match.group(2).lower()
    if unit == "m":
        return value
    if unit == "h":
        return value * 60
    return value * 24 * 60


class SamBot(discord.Client):
    def __init__(self, conversation_manager: ConversationManager, schedule_fn=None):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.reactions = True
        intents.dm_reactions = True
        super().__init__(intents=intents)

        self.conversation_manager = conversation_manager
        self.schedule_fn = schedule_fn
        self.token = os.environ.get("SAM_DISCORD_BOT_TOKEN")

    async def on_ready(self) -> None:
        logger.info(f"SAM ready — logged in as {self.user}")

    async def on_raw_reaction_add(
        self, payload: discord.RawReactionActionEvent
    ) -> None:
        if self.user and payload.user_id == self.user.id:
            return

        reminder = get_reminder_by_message_id(str(payload.message_id))
        if not reminder or reminder.done:
            return

        emoji = payload.emoji.name
        user = await self.fetch_user(payload.user_id)

        if emoji == "✅":
            with get_session() as s:
                r = s.query(Reminder).filter_by(id=reminder.id).first()
                if r:
                    r.done = True
                    r.pending_ack = False
            await user.send("✅ Reminder marked as done.")
            logger.info("reminder completed via reaction", reminder_id=reminder.id)

        elif emoji == "❌":
            with get_session() as s:
                r = s.query(Reminder).filter_by(id=reminder.id).first()
                if r:
                    s.delete(r)
            await user.send("🗑️ Reminder removed.")
            logger.info("reminder deleted via reaction", reminder_id=reminder.id)

    async def on_message(self, message: discord.Message) -> None:
        if message.author == self.user:
            return

        if not isinstance(message.channel, discord.DMChannel):
            return

        discord_id = str(message.author.id)

        # Reply-based snooze: user replies to a reminder embed with 2m / 2h / 2d
        if message.reference and message.reference.message_id:
            reminder = get_reminder_by_message_id(str(message.reference.message_id))
            if reminder and reminder.pending_ack and not reminder.done:
                minutes = _parse_snooze_minutes(message.content)
                if minutes:
                    new_due = datetime.now() + timedelta(minutes=minutes)
                    with get_session() as s:
                        r = s.query(Reminder).filter_by(id=reminder.id).first()
                        if r:
                            r.due_at = new_due
                            r.pending_ack = False
                    if self.schedule_fn:
                        self.schedule_fn(reminder.id, new_due)
                    await message.channel.send(
                        f"⏰ Got it, I'll remind you again in {message.content.strip()}."
                    )
                    logger.info(
                        "reminder snoozed via reply",
                        reminder_id=reminder.id,
                        minutes=minutes,
                    )
                    return

        member_info = get_member_by_channel("discord", discord_id)
        if not member_info:
            logger.warning("unknown_member", discord_id=discord_id)
            await message.channel.send("Sorry, I don't recognise you.")
            return

        async with message.channel.typing():
            try:
                response = await asyncio.to_thread(
                    self.conversation_manager.chat,
                    member_info,
                    message.content,
                )
            except Exception:
                await message.channel.send("Sorry, something went wrong.")
                return

        await message.channel.send(response)

    def run_bot(self) -> None:
        self.run(self.token)
