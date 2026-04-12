import os

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
    ):
        chat_response = self.client.chat.complete(model=self.model, messages=messages)
        return chat_response.choices[
            0
        ].message.content  # none when mistral calls a tool that is why error


def get_llm_client() -> MistralClient:
    provider = os.environ.get("SAM_LLM_PROVIDER")
    if provider == "mistral":
        return MistralClient()
    raise ValueError(f"Unknown or missing SAM_LLM_PROVIDER: {provider!r}")
