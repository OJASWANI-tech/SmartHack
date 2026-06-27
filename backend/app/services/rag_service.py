import logging
import chromadb
from chromadb.config import Settings

from app.services.embedding_service import embedding_service

logger = logging.getLogger("rag_service")

# In-memory ChromaDB client — no PostgreSQL extension needed.
# For persistence across restarts, swap to:
# chromadb.PersistentClient(path="./chroma_data")
_chroma_client = chromadb.EphemeralClient()


def _get_collection(event_id: str):
    """Get or create a ChromaDB collection scoped to this event."""
    collection_name = f"event_{str(event_id).replace('-', '_')}"
    return _chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )


async def index_text_chunk(
    db,  # kept for API compatibility, not used
    event_id,
    source_type: str,
    source_id,
    chunk_index: int,
    content: str,
    visibility: str = "participant",
) -> bool:
    try:
        embedding = await embedding_service.embed(content)
        if embedding is None:
            return False

        collection = _get_collection(str(event_id))
        doc_id = f"{source_type}_{str(source_id)}_{chunk_index}"

        # Upsert — replaces existing chunk if it exists
        collection.upsert(
            ids=[doc_id],
            embeddings=[embedding],
            documents=[content],
            metadatas=[{
                "source_type": source_type,
                "source_id": str(source_id),
                "chunk_index": chunk_index,
                "visibility": visibility,
            }]
        )
        return True
    except Exception as exc:
        logger.error("Failed to index text chunk: %s", exc)
        return False


async def index_kb_entry(db, event_id, entry_id, title: str, content: str) -> bool:
    return await index_text_chunk(db, event_id, "kb_entry", entry_id, 0, f"{title}\n\n{content}")


async def index_faq(db, event_id, faq_id, question: str, answer: str) -> bool:
    return await index_text_chunk(db, event_id, "faq", faq_id, 0, f"Q: {question}\nA: {answer}")


async def index_stage(db, event_id, stage_id, name: str, instructions: str, deliverables_text: str) -> bool:
    return await index_text_chunk(
        db, event_id, "stage", stage_id, 0,
        f"Stage: {name}\n\nInstructions: {instructions or ''}\n\nDeliverables: {deliverables_text or ''}",
    )


async def index_challenge(db, event_id, challenge_id, title: str, description: str, scope: str, constraints: str) -> bool:
    return await index_text_chunk(
        db, event_id, "challenge", challenge_id, 0,
        f"Challenge: {title}\n\nDescription: {description}\n\nScope: {scope or ''}\n\nConstraints: {constraints or ''}",
    )


async def retrieve_relevant_chunks(
    db,
    query: str,
    event_id,
    top_k: int = 4,
    similarity_threshold: float = 0.5,
) -> list[dict]:
    try:
        query_embedding = await embedding_service.embed(query)
        if query_embedding is None:
            return []

        collection = _get_collection(str(event_id))

        # Skip if collection is empty
        if collection.count() == 0:
            return []

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, collection.count()),
            where={"visibility": "participant"},
        )

        chunks = []
        for i, doc in enumerate(results["documents"][0]):
            # ChromaDB returns cosine distance (0=identical, 2=opposite)
            # Convert to similarity score (1=identical, 0=opposite)
            distance = results["distances"][0][i]
            score = 1 - (distance / 2)
            if score >= similarity_threshold:
                chunks.append({
                    "source_type": results["metadatas"][0][i]["source_type"],
                    "content_chunk": doc,
                    "score": score,
                })

        return chunks

    except Exception as exc:
        logger.warning("RAG retrieval unavailable: %s", exc)
        return []