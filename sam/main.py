from dotenv import load_dotenv

from sam.config.loader import load_config
from sam.core.llm.client import get_llm_client
from sam.core.memory.structured import configure_session
from sam.interfaces.messaging.discord_bot import SamBot

load_dotenv()


def start():
    configure_session()
    config = load_config("config/members.toml")
    llm_client = get_llm_client()
    bot = SamBot(config=config, llm_client=llm_client)
    bot.run_bot()


if __name__ == "__main__":
    start()
