import asyncio

import uvicorn
from dotenv import load_dotenv

from sam.core.llm.client import get_llm_client
from sam.core.llm.conversation import ConversationManager
from sam.core.llm.tools import ToolRegistry
from sam.core.memory.structured import configure_session
from sam.core.memory.vector import VectorMemory
from sam.core.scheduler.jobs import (
    build_scheduler,
    hydrate_reminders,
    schedule_reminder,
)
from sam.interfaces.dashboard.app import app as dashboard_app
from sam.interfaces.messaging.discord_bot import SamBot
from sam.logger import configure_logging

load_dotenv()


async def _run() -> None:
    configure_logging()
    configure_session()

    llm_client = get_llm_client()
    vector_memory = VectorMemory(path="~/.sam/vector.chroma")
    scheduler = build_scheduler()

    registry = ToolRegistry(vector_memory=vector_memory)
    conversation_manager = ConversationManager(llm_client=llm_client, registry=registry)

    bot = SamBot(
        conversation_manager=conversation_manager,
        schedule_fn=lambda rid, due: schedule_reminder(scheduler, bot, rid, due),
    )
    registry.schedule_fn = lambda rid, due: schedule_reminder(scheduler, bot, rid, due)

    scheduler.start()
    hydrate_reminders(scheduler, bot)

    dashboard = uvicorn.Server(
        uvicorn.Config(dashboard_app, host="127.0.0.1", port=8765, log_level="info")
    )

    try:
        await asyncio.gather(
            dashboard.serve(),
            bot.start(bot.token),
        )
    finally:
        scheduler.shutdown()


def start() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    start()
