import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_knowledge import EventKnowledgeEntry
from app.services.rag_service import index_kb_entry

logger = logging.getLogger("rag_indexer")


async def index_all_existing_kb(db: AsyncSession) -> dict:
    """Index all existing EventKnowledgeEntry rows into ChromaDB."""
    try:
        entries = (
            await db.execute(
                select(EventKnowledgeEntry).where(EventKnowledgeEntry.is_active == True)
            )
        ).scalars().all()

        indexed = 0
        for entry in entries:
            success = await index_kb_entry(db, entry.event_id, entry.id, entry.title, entry.content)
            if success:
                indexed += 1

        return {"indexed": indexed, "skipped": 0}
    except Exception as exc:
        logger.warning("RAG indexing skipped: %s", exc)
        return {"indexed": 0, "skipped": 0, "error": str(exc)}