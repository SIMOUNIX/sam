import json
import os
from typing import Any, Callable, Optional

from mistralai.client import Mistral
from mistralai.client.models.chatcompletionrequest import (
    ChatCompletionRequestMessageTypedDict,
)


class MistralClient:
    def __init__(self):
        self.client = Mistral(api_key=os.environ.get("SAM_MISTRAL_API_KEY"))
        self.model = "mistral-small-2506"

    def chat(
        self,
        messages: list[ChatCompletionRequestMessageTypedDict],
        tools: Optional[list[Any]] = None,
        names_to_functions: Optional[dict[str, Callable]] = None,
    ) -> str:
        response = self.client.chat.complete(
            model=self.model, messages=messages, tool_choice="auto", tools=tools
        )

        message = response.choices[0].message
        while message is not None and message.tool_calls:
            messages.append(message.model_dump())  # type: ignore[arg-type]

            for tool_call in message.tool_calls:
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
                model=self.model,
                messages=messages,
                tools=tools,
            )
            message = response.choices[0].message

        return message.content if message is not None else ""


def get_llm_client() -> MistralClient:
    provider = os.environ.get("SAM_LLM_PROVIDER")
    if provider == "mistral":
        return MistralClient()
    raise ValueError(f"Unknown or missing SAM_LLM_PROVIDER: {provider!r}")
