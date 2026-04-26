from pathlib import Path
import os

import chromadb
from mistralai.client import Mistral


class VectorMemory:
    def __init__(self, path: str):
        self.embedder = Mistral(api_key=os.environ.get("SAM_MISTRAL_API_KEY"))
        self.chroma = chromadb.PersistentClient(path=str(Path(path).expanduser()))
        self.collection = self.chroma.get_or_create_collection("memories")

    def _embed(self, text: str) -> list[float]:
        response = self.embedder.embeddings.create(model="mistral-embed", inputs=[text])
        return response.data[0].embedding

    def store(self, id: int, member_id: int, type: str, text: str) -> None:
        self.collection.add(
            ids=[str(id)],
            documents=[text],
            metadatas=[{"member_id": str(member_id), "type": type}],
            embeddings=[self._embed(text)],
        )

    def search(self, member_id: int, query: str, n_results: int = 5) -> list[str]:
        q_res = self.collection.query(
            query_embeddings=[self._embed(query)],
            n_results=n_results,
            where={"member_id": str(member_id)},
        )
        return q_res["documents"][0] if q_res["documents"] else []
