from dotenv import load_dotenv

from sam.core.llm.client import get_llm_client
from sam.core.llm.tools import ToolRegistry
from sam.core.memory.structured import configure_session
from sam.core.memory.vector import VectorMemory
from sam.interfaces.messaging.discord_bot import SamBot
from sam.logger import configure_logging

load_dotenv()


def start():
    configure_logging()
    configure_session()
    llm_client = get_llm_client()
    vector_memory = VectorMemory(path="~/.sam/vector.chroma")
    registry = ToolRegistry(vector_memory=vector_memory)
    bot = SamBot(llm_client=llm_client, registry=registry)
    bot.run_bot()


if __name__ == "__main__":
    start()
