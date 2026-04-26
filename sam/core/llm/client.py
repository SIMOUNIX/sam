import json
import os
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

import structlog
from mistralai.client import Mistral
from mistralai.client.models.chatcompletionrequest import (
    ChatCompletionRequestMessageTypedDict,
)

logger = structlog.get_logger()

# Pricing per 1M tokens (USD) — update as Mistral changes rates
_PRICING: dict[str, dict[str, float]] = {
    "mistral-small-2506": {"input": 0.20, "output": 0.60},
    "mistral-small-latest": {"input": 0.20, "output": 0.60},
    "mistral-medium-latest": {"input": 0.40, "output": 1.20},
    "mistral-large-latest": {"input": 2.00, "output": 6.00},
    "mistral-large-2411": {"input": 2.00, "output": 6.00},
}
_DEFAULT_PRICING = {"input": 0.40, "output": 1.20}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    p = _PRICING.get(model, _DEFAULT_PRICING)
    return (input_tokens * p["input"] + output_tokens * p["output"]) / 1_000_000


@dataclass
class ChatResult:
    content: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    tool_calls_count: int = 0
    duration_ms: int = 0
    cost_usd: float = field(init=False)

    def __post_init__(self) -> None:
        self.cost_usd = estimate_cost(self.model, self.input_tokens, self.output_tokens)


class MistralClient:
    def __init__(self) -> None:
        self.client = Mistral(api_key=os.environ.get("SAM_MISTRAL_API_KEY"))
        self.model = "mistral-small-2506"

    def chat(
        self,
        messages: list[ChatCompletionRequestMessageTypedDict],
        tools: Optional[list[Any]] = None,
        names_to_functions: Optional[dict[str, Callable]] = None,
    ) -> ChatResult:
        t0 = time.monotonic()
        total_input = 0
        total_output = 0
        tool_calls_count = 0

        response = self.client.chat.complete(
            model=self.model, messages=messages, tool_choice="auto", tools=tools
        )
        if response.usage:
            total_input += response.usage.prompt_tokens
            total_output += response.usage.completion_tokens

        message = response.choices[0].message
        while message is not None and message.tool_calls:
            messages.append(
                {
                    "role": "assistant",
                    "content": message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in message.tool_calls
                    ],
                }
            )

            for tool_call in message.tool_calls:
                tool_calls_count += 1
                logger.debug("tool_call", tool_call=tool_call)
                function_name = tool_call.function.name
                function_params = json.loads(tool_call.function.arguments)
                function_result = names_to_functions[function_name](**function_params)  # type: ignore[index]
                messages.append(
                    {
                        "role": "tool",
                        "name": function_name,
                        "content": str(function_result),
                        "tool_call_id": tool_call.id,
                    }
                )

            response = self.client.chat.complete(
                model=self.model, messages=messages, tools=tools
            )
            if response.usage:
                total_input += response.usage.prompt_tokens
                total_output += response.usage.completion_tokens
            message = response.choices[0].message

        duration_ms = int((time.monotonic() - t0) * 1000)
        content = message.content if message is not None else ""

        return ChatResult(
            content=content,
            model=self.model,
            input_tokens=total_input,
            output_tokens=total_output,
            tool_calls_count=tool_calls_count,
            duration_ms=duration_ms,
        )


def get_llm_client() -> MistralClient:
    provider = os.environ.get("SAM_LLM_PROVIDER")
    if provider == "mistral":
        return MistralClient()
    raise ValueError(f"Unknown or missing SAM_LLM_PROVIDER: {provider!r}")
