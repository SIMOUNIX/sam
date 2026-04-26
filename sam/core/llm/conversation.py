from datetime import datetime

import structlog

from sam.core.llm.client import ChatResult, MistralClient
from sam.core.llm.tools import TOOLS, ToolRegistry
from sam.core.memory.structured import Run, get_family_members, get_session

log = structlog.get_logger()

_SUMMARIZE_AFTER = 10
_KEEP_FRESH = 3


def _format_for_summary(messages: list) -> str:
    lines = []
    for m in messages:
        role = m.get("role", "")
        content = m.get("content", "")
        if role in ("user", "assistant") and content:
            lines.append(f"{role.upper()}: {content}")
    return "\n".join(lines)


class ConversationManager:
    def __init__(self, llm_client: MistralClient, registry: ToolRegistry):
        self.llm_client = llm_client
        self.registry = registry
        self._histories: dict[str, list] = {}

    def _build_system_prompt(self, member_info: dict) -> str:
        family_members = get_family_members(member_info["family_id"])
        members_desc = ", ".join(
            f"{m['firstname']} (id:{m['member_id']})" for m in family_members
        )
        return (
            f"You are SAM, a personal assistant for families.\n"
            f"Today is {datetime.now().strftime('%A, %B %d %Y')}.\n"
            f"You are speaking with {member_info['firstname']} (member_id={member_info['member_id']}) "
            f"from the {member_info['family_name']} family.\n"
            f"Family members: {members_desc}\n\n"
            f"Use these tools proactively:\n"
            f"- save_memory: when you learn a fact, preference, or relationship about a member\n"
            f"- save_episode: when something specific happens or is mentioned\n"
            f"- save_event: when a member has a calendar event\n"
            f"- create_reminder: when a member needs to be reminded of something\n"
            f"Always use the member's integer member_id when calling tools.\n"
            f"After calling a tool, acknowledge naturally and briefly."
        )

    def _get_history(self, member_id: int, member_info: dict) -> list:
        member_id = str(member_id)
        if member_id not in self._histories:
            self._histories[member_id] = [
                {"role": "system", "content": self._build_system_prompt(member_info)}
            ]
        else:
            self._histories[member_id][0]["content"] = self._build_system_prompt(
                member_info
            )
        return self._histories[member_id]

    def _maybe_summarize(self, history: list) -> None:
        messages = history[1:]
        if len(messages) < _SUMMARIZE_AFTER:
            return

        to_summarize = messages[:-_KEEP_FRESH]
        keep_fresh = messages[-_KEEP_FRESH:]

        summary_messages = [
            {
                "role": "system",
                "content": (
                    "Summarise this conversation segment for a personal assistant's memory. "
                    "Focus on: unresolved topics, emotional context, things mentioned but not yet saved. "
                    "Skip: tool call exchanges, pleasantries, anything already confirmed saved. "
                    "Plain prose, no bullet points, be concise."
                ),
            },
            {"role": "user", "content": _format_for_summary(to_summarize)},
        ]

        try:
            result = self.llm_client.chat(messages=summary_messages)
            history[1:] = [
                {
                    "role": "assistant",
                    "content": f"[Conversation summary]\n{result.content}",
                }
            ] + keep_fresh
            log.info(
                "history summarised",
                compressed_from=len(messages),
                compressed_to=len(history) - 1,
            )
        except Exception as exc:
            log.warning("summarization failed", error=str(exc))

    def _save_run(self, member_id: int, result: ChatResult, status: str) -> None:
        try:
            with get_session() as s:
                s.add(
                    Run(
                        member_id=member_id,
                        model=result.model,
                        input_tokens=result.input_tokens,
                        output_tokens=result.output_tokens,
                        tool_calls=result.tool_calls_count,
                        duration_ms=result.duration_ms,
                        cost_usd=result.cost_usd,
                        status=status,
                    )
                )
        except Exception as exc:
            log.warning("run_tracking_failed", error=str(exc))

    def chat(self, member_info: dict, text: str) -> str:
        history = self._get_history(member_info["member_id"], member_info)
        checkpoint = len(history)
        history.append(
            {
                "role": "user",
                "content": f"[{datetime.now().strftime('%A, %B %d %Y at %H:%M')}] {text}",
            }
        )

        status = "ok"
        try:
            result = self.llm_client.chat(
                messages=history,
                tools=TOOLS,
                names_to_functions=self.registry.names_to_functions,
            )
        except Exception as exc:
            status = "error"
            del history[checkpoint:]  # roll back user msg + any partial tool exchanges
            log.error("llm_chat_failed", error=str(exc))
            raise

        history.append({"role": "assistant", "content": result.content})
        self._maybe_summarize(history)
        self._save_run(member_info["member_id"], result, status)
        return result.content
