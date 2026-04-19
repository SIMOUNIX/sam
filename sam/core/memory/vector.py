from pathlib import Path

import chromadb
from chromadb.utils.embedding_functions import MistralEmbeddingFunction


class VectorMemory:
    def __init__(self, path: Path):
        self.embedder = MistralEmbeddingFunction(
            model="mistral-embed", api_key_env_var="SAM_MISTRAL_API_KEY"
        )
        self.chroma = chromadb.PersistentClient(path=str(path))
        self.collection = self.chroma.get_or_create_collection("memories")

    def store(self, id: int, member_discord_id: str, type: str, text: str) -> None:
        embeddings = self.embedder(input=[text])
        self.collection.add(
            ids=[str(id)],
            documents=[text],
            metadatas=[{"member_discord_id": member_discord_id, "type": type}],
            embeddings=embeddings,
        )

    def search(
        self, member_discord_id: str, query: str, n_results: int = 5
    ) -> list[str]:

        query_embedding = self.embedder(input=[query])
        q_res = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            where={"member_discord_id": member_discord_id},
        )

        return q_res["documents"][0] if q_res["documents"] else []
