import logging
from datetime import UTC

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.services.collection_service import CollectionService

logger = logging.getLogger(__name__)


def build_scheduler(
    collection_service: CollectionService,
    *,
    interval_minutes: int,
) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=UTC)

    async def scheduled_collection() -> None:
        logger.info("scheduled collection started")
        results = await collection_service.collect_all(trigger="scheduled")
        logger.info("scheduled collection finished with %s source results", len(results))

    scheduler.add_job(
        scheduled_collection,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id="news-collection",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
        misfire_grace_time=300,
    )
    return scheduler
