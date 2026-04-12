from dotenv import load_dotenv

from sam.core.llm.client import get_llm_client

load_dotenv()


client = get_llm_client()

response = client.chat([{"role": "user", "content": "Say hello in one sentence."}])

print(response)
