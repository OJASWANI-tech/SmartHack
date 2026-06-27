import logging

from app.core.config import settings

logger = logging.getLogger("embedding_service")


class EmbeddingService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = getattr(settings, "GROQ_EMBEDDING_MODEL", "nomic-embed-text-v1_5")
        self.enabled = bool(self.api_key and self.api_key != "dummy_key")
        self.client = None

        if not self.enabled:
            return

        try:
            from groq import Groq

            self.client = Groq(api_key=self.api_key)
        except Exception as exc:
            logger.warning("Groq embedding client disabled: %s", exc)
            self.enabled = False

    async def embed(self, text: str) -> list[float] | None:
        if not self.enabled or not self.client:
            return None
        try:
            trimmed = (text or "")[:8000]
            response = self.client.embeddings.create(model=self.model, input=trimmed)
            return response.data[0].embedding
        except Exception as exc:
            logger.warning("Embedding request failed: %s", exc)
            return None

    async def embed_batch(self, texts: list[str]) -> list[list[float] | None]:
        return [await self.embed(text) for text in texts]


embedding_service = EmbeddingService()
