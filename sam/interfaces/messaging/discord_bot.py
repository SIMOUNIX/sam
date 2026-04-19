import os
from datetime import datetime

import discord
import structlog
from dotenv import load_dotenv

from sam.config.loader import SamConfig
from sam.core.llm.client import MistralClient
from sam.core.llm.tools import TOOLS, ToolRegistry

load_dotenv()
logger = structlog.get_logger()


class SamBot(discord.Client):
    def __init__(
        self, config: SamConfig, llm_client: MistralClient, registry: ToolRegistry
    ):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(intents=intents)

        self.config = config
        self.llm_client = llm_client
        self.registry = registry
        self.token = os.environ.get("SAM_DISCORD_BOT_TOKEN")

        self._known_members: dict[str, str] = {
            member.discord_id: member.firstname
            for family in config.families
            for member in family.members
        }
        self._histories: dict[str, list] = {}

    def _get_history(self, discord_id: str) -> list:
        if discord_id not in self._histories:
            firstname = self._known_members[discord_id]
            self._histories[discord_id] = [
                {
                    "role": "system",
                    "content": (
                        f"You are SAM, a personal assistant for families.\n"
                        f"Today is {datetime.now().strftime('%A, %B %d %Y')}.\n"
                        f"You are speaking with {firstname}.\n"
                        f"Here is the family configuration: {self.config}\n\n"
                        f"Use these tools proactively:\n"
                        f"- save_memory: when you learn a fact, preference, or relationship about a member\n"
                        f"- save_episode: when something specific happens or is mentioned\n"
                        f"- save_event: when a member has a calendar event\n"
                        f"- create_reminder: when a member needs to be reminded of something\n"
                        f"Always use the member's discord_id from the config above.\n"
                        f"After calling a tool, acknowledge naturally and briefly."
                    ),
                }
            ]
        return self._histories[discord_id]

    async def on_ready(self):
        logger.info(f"SAM ready — logged in as {self.user}")

    async def on_message(self, message: discord.Message):
        if message.author == self.user:
            return

        if not isinstance(message.channel, discord.DMChannel):
            return

        discord_id = str(message.author.id)

        if discord_id not in self._known_members:
            logger.warning(f"Unknown member: {discord_id}")
            await message.channel.send("Sorry, I don't recognise you.")
            return

        async with message.channel.typing():
            history = self._get_history(discord_id)
            history.append(
                {
                    "role": "user",
                    "content": f"[{datetime.now().strftime('%H:%M')}] {message.content}",
                }
            )

            response = self.llm_client.chat(
                messages=history,
                tools=TOOLS,
                names_to_functions=self.registry.names_to_functions,
            )

            history.append({"role": "assistant", "content": response})

        await message.channel.send(response)

    def run_bot(self):
        self.run(self.token)
