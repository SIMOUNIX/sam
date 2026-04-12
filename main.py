from dotenv import load_dotenv

from sam.core.llm.client import MistralClient

load_dotenv()


def main():
    client = MistralClient()
    print(client.chat([]))
    print("Hello from sam!")


if __name__ == "__main__":
    main()
