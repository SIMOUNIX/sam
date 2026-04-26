import os
import re
from datetime import datetime, timedelta

import discord
import structlog
from dotenv import load_dotenv

from sam.core.llm.client import MistralClient
from sam.core.llm.tools import TOOLS, ToolRegistry
from sam.core.memory.structured import (
    Reminder,
    Run,
    get_family_members,
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
    def __init__(self, llm_client: MistralClient, registry: ToolRegistry):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.reactions = True
        intents.dm_reactions = True
        super().__init__(intents=intents)

        self.llm_client = llm_client
        self.registry = registry
        self.token = os.environ.get("SAM_DISCORD_BOT_TOKEN")
        self._histories: dict[str, list] = {}

    def _build_system_prompt(self, member_info: dict) -> str:
        family_members = get_family_members(member_info["family_id"])
        members_desc = ", ".join(
            f"{m['firstname']} ({', '.join(f'{p}:{v}' for p, v in m['channels'].items())})"
            for m in family_members
        )
        return (
            f"You are SAM, a personal assistant for families.\n"
            f"Today is {datetime.now().strftime('%A, %B %d %Y')}.\n"
            f"You are speaking with {member_info['firstname']} from the {member_info['family_name']} family.\n"
            f"Family members: {members_desc}\n\n"
            f"Use these tools proactively:\n"
            f"- save_memory: when you learn a fact, preference, or relationship about a member\n"
            f"- save_episode: when something specific happens or is mentioned\n"
            f"- save_event: when a member has a calendar event\n"
            f"- create_reminder: when a member needs to be reminded of something\n"
            f"Always use the member's discord ID when calling tools.\n"
            f"After calling a tool, acknowledge naturally and briefly."
        )

    def _get_history(self, discord_id: str, member_info: dict) -> list:
        if discord_id not in self._histories:
            self._histories[discord_id] = [
                {"role": "system", "content": self._build_system_prompt(member_info)}
            ]
        return self._histories[discord_id]

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
                    if self.registry.schedule_fn:
                        self.registry.schedule_fn(reminder.id, new_due)
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
            history = self._get_history(discord_id, member_info)
            history.append(
                {
                    "role": "user",
                    "content": f"[{datetime.now().strftime('%A, %B %d %Y at %H:%M')}] {message.content}",
                }
            )

            status = "ok"
            try:
                result = self.llm_client.chat(
                    messages=history,
                    tools=TOOLS,
                    names_to_functions=self.registry.names_to_functions,
                )
            except Exception as exc:
                status = "error"
                logger.error("llm_chat_failed", error=str(exc))
                await message.channel.send("Sorry, something went wrong.")
                return

            history.append({"role": "assistant", "content": result.content})

            try:
                with get_session() as s:
                    s.add(
                        Run(
                            member_discord_id=discord_id,
                            model=result.model,
                            input_tokens=result.input_tokens,
                            output_tokens=result.output_tokens,
                            tool_calls=result.tool_calls_count,
                            duration_ms=result.duration_ms,
                            cost_usd=result.cost_usd,
                            status=status,
                        )
                    )
            except Exception as exc:
                logger.warning("run_tracking_failed", error=str(exc))

        await message.channel.send(result.content)

    def run_bot(self) -> None:
        self.run(self.token)
