from sam.core.llm.tools import ToolRegistry
from sam.core.memory.vector import VectorMemory
from dotenv import load_dotenv

from sam.config.loader import load_config
from sam.core.llm.client import get_llm_client
from sam.core.memory.structured import configure_session
from sam.interfaces.messaging.discord_bot import SamBot
from sam.logger import configure_logging

load_dotenv()


def start():
    configure_logging()
    configure_session()
    config = load_config("config/members.toml")
    llm_client = get_llm_client()

    vector_memory = VectorMemory(path="~/.sam/vector.chroma")
    registry = ToolRegistry(vector_memory=vector_memory)
    bot = SamBot(config=config, llm_client=llm_client, registry=registry)
    bot.run_bot()


if __name__ == "__main__":
    start()
