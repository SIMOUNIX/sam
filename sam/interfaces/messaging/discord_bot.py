import os

import discord
import dotenv

dotenv.load_dotenv()


class DiscordClient(discord.Client):
    def __init__(self):
        self.token = os.environ.get("SAM_DISCORD_BOT_TOKEN")
        super().__init__(intents=discord.Intents.default())

    async def on_ready(self):
        print(f"Logged on as {self.user}!")

    async def on_message(self, message):
        if message.author == self.user:
            return

        print(f"Message from {message.author}: {message.content}")

        await message.channel.send("hi there")


client = DiscordClient()
client.run(client.token)
