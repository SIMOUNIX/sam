import argparse
import sys

from dotenv import load_dotenv

from sam.core.memory.structured import (
    Channel,
    Family,
    Member,
    configure_session,
    get_session,
)

load_dotenv()

PLATFORMS = ["discord", "slack", "telegram"]


def register():
    parser = argparse.ArgumentParser(
        prog="sam-register",
        description="Register a member and link their communication channels.",
    )
    parser.add_argument(
        "--family", required=True, help="Family name (created if missing)"
    )
    parser.add_argument("--firstname", required=True, help="Member first name")
    parser.add_argument("--discord", metavar="ID", help="Discord user ID")
    parser.add_argument("--slack", metavar="ID", help="Slack member ID")
    parser.add_argument("--telegram", metavar="ID", help="Telegram user ID")
    args = parser.parse_args()

    channels_to_add = {p: getattr(args, p) for p in PLATFORMS if getattr(args, p)}
    if not channels_to_add:
        print(
            "Error: provide at least one channel (--discord, --slack, --telegram)",
            file=sys.stderr,
        )
        sys.exit(1)

    configure_session()

    with get_session() as s:
        family = s.query(Family).filter_by(name=args.family).first()
        if not family:
            family = Family(name=args.family)
            s.add(family)
            s.flush()
            print(f"Created family: {args.family}")

        member = Member(family_id=family.id, firstname=args.firstname)
        s.add(member)
        s.flush()

        for platform, platform_id in channels_to_add.items():
            s.add(
                Channel(member_id=member.id, platform=platform, platform_id=platform_id)
            )

    channels_str = ", ".join(f"{p}={v}" for p, v in channels_to_add.items())
    print(f"Registered {args.firstname} ({args.family}) — {channels_str}")
