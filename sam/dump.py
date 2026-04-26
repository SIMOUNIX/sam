from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

from sam.core.memory.structured import (
    Episode,
    Event,
    Memory,
    Reminder,
    configure_session,
    get_session,
)

load_dotenv()
console = Console()


def print_table(title: str, rows: list, columns: list[tuple[str, str]]) -> None:
    table = Table(title=title, show_lines=True)
    for col_name, style in columns:
        table.add_column(col_name, style=style)
    for row in rows:
        table.add_row(*row)
    console.print(table)
    console.print()


def dump() -> None:
    configure_session()

    with get_session() as s:
        memories = s.query(Memory).order_by(Memory.created_at).all()
        episodes = s.query(Episode).order_by(Episode.created_at).all()
        events = s.query(Event).order_by(Event.start_at).all()
        reminders = s.query(Reminder).order_by(Reminder.due_at).all()

    print_table(
        "Memories",
        [[str(m.member_id), m.content, str(m.created_at)] for m in memories],
        [("Member ID", "cyan"), ("Content", "white"), ("Saved at", "dim")],
    )

    print_table(
        "Episodes",
        [
            [str(e.member_id), e.content, e.context or "", str(e.created_at)]
            for e in episodes
        ],
        [
            ("Member ID", "cyan"),
            ("Content", "white"),
            ("Context", "dim"),
            ("Saved at", "dim"),
        ],
    )

    print_table(
        "Events",
        [
            [
                str(v.member_id),
                v.title,
                v.description or "",
                str(v.start_at),
                str(v.end_at or ""),
            ]
            for v in events
        ],
        [
            ("Member ID", "cyan"),
            ("Title", "white"),
            ("Description", "dim"),
            ("Start", "green"),
            ("End", "green"),
        ],
    )

    print_table(
        "Reminders",
        [
            [str(r.member_id), r.content, str(r.due_at), "✓" if r.done else "✗"]
            for r in reminders
        ],
        [
            ("Member ID", "cyan"),
            ("Content", "white"),
            ("Due at", "yellow"),
            ("Done", "green"),
        ],
    )


if __name__ == "__main__":
    dump()
