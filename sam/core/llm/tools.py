from sam.core.memory.structured import Memory, get_session


def save_memory(member_discord_id: str, content: str) -> str:
    with get_session() as s:
        s.add(Memory(member_discord_id=member_discord_id, content=content))
    return "memory saved"


NAMES_TO_FUNCTIONS = {
    "save_memory": save_memory,
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": "Save a fact or preference about a member.",
            "parameters": {
                "type": "object",
                "properties": {
                    "member_discord_id": {"type": "string"},
                    "content": {
                        "type": "string",
                        "description": "The fact to remember.",
                    },
                },
                "required": ["member_discord_id", "content"],
            },
        },
    }
]
