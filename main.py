from dotenv import load_dotenv

from sam.config.loader import load_config
from sam.core.memory.structured import configure_session, get_session

# from sam.core.llm.client import get_llm_client

load_dotenv()


def main():
    configure_session()

    with get_session() as session:
        print(session.is_active)
    # client = get_llm_client()

    # response = client.chat([{"role": "user", "content": "Say hello in one sentence."}])

    # print(response)

    config = load_config("config/members.toml")
    print(config)


if __name__ == "__main__":
    main()
