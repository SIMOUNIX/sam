from dotenv import load_dotenv
from rich.console import Console
from rich.markdown import Markdown
from rich.prompt import Prompt

from sam.config.loader import load_config
from sam.core.llm.client import get_llm_client
from sam.core.llm.tools import NAMES_TO_FUNCTIONS, TOOLS
from sam.core.memory.structured import configure_session

load_dotenv()
console = Console()


def start():
    client = get_llm_client()
    config = load_config("config/members.toml")
    messages = [
        {
            "role": "system",
            "content": (
                f"You are SAM, a personal assistant for families.\n"
                f"Here is the family configuration: {config}\n\n"
                f"Whenever you learn a new fact, preference, or relationship about a member, "
                f"immediately call save_memory using their discord_id from the config above."
            ),
        }
    ]
    console.print("[bold green]SAM[/] ready. Ctrl+C to quit.\n")

    try:
        while True:
            user_input = Prompt.ask("[bold cyan]you[/]")
            if not user_input:
                continue
            messages.append({"role": "user", "content": user_input})
            response = client.chat(
                messages=messages, tools=TOOLS, names_to_functions=NAMES_TO_FUNCTIONS
            )
            messages.append({"role": "assistant", "content": response})
            console.print("[bold green]sam[/]")
            console.print(Markdown(response))
            console.print()
    except KeyboardInterrupt:
        console.print("[bold red]\nExiting...[/]")


if __name__ == "__main__":
    configure_session()
    start()
