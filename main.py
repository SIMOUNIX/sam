from dotenv import load_dotenv
from rich.console import Console
from rich.markdown import Markdown
from rich.prompt import Prompt

from sam.core.llm.client import get_llm_client

load_dotenv()
console = Console()


def start():
    client = get_llm_client()
    messages = []
    console.print("[bold green]SAM[/] ready. Ctrl+C to quit.\n")

    try:
        while True:
            user_input = Prompt.ask("[bold cyan]you[/]")
            if not user_input:
                continue
            messages.append({"role": "user", "content": user_input})
            response = client.chat(messages)
            messages.append({"role": "assistant", "content": response})
            console.print("[bold green]sam[/]")
            console.print(Markdown(response))
            console.print()
    except KeyboardInterrupt:
        console.print("[bold red]\nExiting...[/]")


if __name__ == "__main__":
    start()
