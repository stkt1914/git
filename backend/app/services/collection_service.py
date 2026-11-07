import hashlib
import logging
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import uuid4

import feedparser
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.config.source_catalog import FeedDefinition, NewsSourceDefinition
from app.lib.time import as_utc, clean_text
from app.models.news import CollectionLog, NewsItem, NewsSource
from app.services.http_client import fetch_url
from app.services.source_registry import source_definition_from_model
from app.services.source_validator import entry_datetime

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class CollectionResult:
    run_id: str
    source_id: str
    status: str
    items_seen: int = 0
    items_inserted: int = 0
    items_updated: int = 0
    items_skipped: int = 0
    http_status: int | None = None
    error: str | None = None
    details: dict[str, object] = field(default_factory=dict)


class CollectionService:
    def __init__(
        self,
        *,
        session_factory: sessionmaker[Session],
        user_agent: str,
        default_timeout_seconds: float,
    ) -> None:
        self.session_factory = session_factory
        self.user_agent = user_agent
        self.default_timeout_seconds = default_timeout_seconds

    async def collect_source(
        self,
        source_id: str,
        *,
        trigger: str,
        run_id: str | None = None,
    ) -> CollectionResult:
        run_id = run_id or str(uuid4())
        started_at = datetime.now(UTC)
        started_perf = time.perf_counter()

        with self.session_factory() as session:
            source_model = session.get(NewsSource, source_id)
            if source_model is None:
                raise LookupError(f"source not found: {source_id}")
            if source_model.is_paused:
                result = CollectionResult(
                    run_id=run_id,
                    source_id=source_id,
                    status="skipped",
                    error="source is paused",
                )
                self._write_log(session, result, trigger, started_at, started_perf)
                return result
            if not source_model.is_enabled:
                result = CollectionResult(
                    run_id=run_id,
                    source_id=source_id,
                    status="skipped",
                    error="source is disabled",
                )
                self._write_log(session, result, trigger, started_at, started_perf)
                return result
            source = source_definition_from_model(source_model)

        if not source.feeds:
            result = CollectionResult(
                run_id=run_id,
                source_id=source_id,
                status="skipped",
                error="source has no collectable feed",
            )
            with self.session_factory() as session:
                self._write_log(session, result, trigger, started_at, started_perf)
            return result

        result = CollectionResult(
            run_id=run_id,
            source_id=source_id,
            status="started",
        )
        feed_details: list[dict[str, object]] = []
        latest_published_at: datetime | None = None

        with self.session_factory() as session:
            source_model = session.get(NewsSource, source_id)
            if source_model is None:
                raise LookupError(f"source not found: {source_id}")

            for feed in source.feeds:
                feed_result, articles = await self._collect_feed(source, feed)
                feed_details.append(feed_result)
                result.items_seen += int(feed_result.get("items_seen", 0))
                result.items_skipped += int(feed_result.get("items_skipped", 0))
                if result.http_status is None:
                    result.http_status = _optional_int(feed_result.get("http_status"))

                for article in articles:
                    published_at = as_utc(article["published_at"])
                    if latest_published_at is None or published_at > latest_published_at:
                        latest_published_at = published_at
                    existing = session.get(NewsItem, article["id"])
                    if existing is None:
                        session.add(NewsItem(**article))
                        result.items_inserted += 1
                    else:
                        for key, value in article.items():
                            if key == "content" and value is None:
                                continue
                            setattr(existing, key, value)
                        result.items_updated += 1

            successful_feeds = sum(
                1 for detail in feed_details if detail.get("status") in {"success", "partial"}
            )
            if successful_feeds == len(feed_details) and all(
                detail.get("status") == "success" for detail in feed_details
            ):
                result.status = "success"
            elif successful_feeds > 0:
                result.status = "partial"
            else:
                result.status = "failed"

            errors = [str(detail["error"]) for detail in feed_details if detail.get("error")]
            result.error = "; ".join(errors) if errors else None
            result.details = {"feeds": feed_details}

            finished_at = datetime.now(UTC)
            source_model.last_collected_at = finished_at
            source_model.last_http_status = result.http_status
            source_model.last_error = result.error
            if successful_feeds > 0:
                source_model.last_success_at = finished_at

            if latest_published_at and (
                source_model.latest_item_published_at is None
                or as_utc(source_model.latest_item_published_at) < latest_published_at
            ):
                source_model.latest_item_published_at = latest_published_at

            self._write_log(
                session,
                result,
                trigger,
                started_at,
                started_perf,
                finished_at=finished_at,
            )

        logger.info(
            "collection source=%s status=%s seen=%s inserted=%s updated=%s",
            source_id,
            result.status,
            result.items_seen,
            result.items_inserted,
            result.items_updated,
        )
        return result

    async def collect_all(self, *, trigger: str) -> list[CollectionResult]:
        run_id = str(uuid4())
        with self.session_factory() as session:
            source_ids = list(
                session.scalars(
                    select(NewsSource.id)
                    .where(
                        NewsSource.is_enabled.is_(True),
                        NewsSource.is_paused.is_(False),
                    )
                    .order_by(NewsSource.id)
                )
            )

        results: list[CollectionResult] = []
        for source_id in source_ids:
            try:
                results.append(
                    await self.collect_source(
                        source_id,
                        trigger=trigger,
                        run_id=run_id,
                    )
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("collection failed for source=%s", source_id)
                result = CollectionResult(
                    run_id=run_id,
                    source_id=source_id,
                    status="failed",
                    error=f"{exc.__class__.__name__}: {exc}",
                )
                with self.session_factory() as session:
                    self._write_log(
                        session,
                        result,
                        trigger,
                        datetime.now(UTC),
                        time.perf_counter(),
                    )
                results.append(result)
        return results

    async def _collect_feed(
        self,
        source: NewsSourceDefinition,
        feed: FeedDefinition,
    ) -> tuple[dict[str, object], list[dict[str, object]]]:
        fetched = await fetch_url(
            feed.url,
            timeout_seconds=source.timeout_seconds or self.default_timeout_seconds,
            retry_count=source.retry_count,
            user_agent=self.user_agent,
        )
        detail: dict[str, object] = {
            "feed_url": feed.url,
            "http_status": fetched.status_code,
            "status": "failed",
            "items_seen": 0,
            "items_skipped": 0,
            "error": fetched.error,
        }
        if fetched.response is None:
            return detail, []

        response = fetched.response
        parsed = feedparser.parse(
            response.content,
            response_headers={"content-type": response.headers.get("content-type", "")},
        )
        entries = list(parsed.get("entries") or [])[: source.max_items]
        version = str(parsed.get("version") or "")
        collection_method = "atom" if "atom" in version else "rss"
        articles: list[dict[str, object]] = []

        for entry in entries:
            original_url = str(entry.get("link") or "").strip()
            title = clean_text(entry.get("title"), max_length=500)
            published_at = entry_datetime(entry)
            if not original_url.startswith(("http://", "https://")):
                detail["items_skipped"] = int(detail["items_skipped"]) + 1
                continue
            if not title or published_at is None:
                detail["items_skipped"] = int(detail["items_skipped"]) + 1
                continue

            external_id = str(entry.get("id") or original_url)
            article_id = _article_id(source.id, external_id)
            summary = clean_text(
                entry.get("summary") or entry.get("description"),
                max_length=2000,
            )
            content = None
            if source.collect_content and source.copyright_status == "full_text_allowed":
                content = clean_text(
                    entry.get("content", [{}])[0].get("value") if entry.get("content") else None,
                    max_length=20000,
                )

            articles.append(
                {
                    "id": article_id,
                    "external_id": external_id[:512],
                    "title": title,
                    "summary": summary,
                    "content": content,
                    "original_url": original_url,
                    "source_id": source.id,
                    "source_name": source.name,
                    "publisher": source.publisher,
                    "language": source.language,
                    "country_or_region": source.country_or_region,
                    "published_at": published_at,
                    "collected_at": datetime.now(UTC),
                    "category": feed.category or source.default_category,
                    "image_url": None,
                    "collection_method": collection_method,
                    "content_license_status": source.copyright_status,
                }
            )

        detail["items_seen"] = len(entries)
        detail["items_ready"] = len(articles)
        skipped = int(detail["items_skipped"])
        if entries and articles and skipped == 0:
            detail["status"] = "success"
        elif entries and articles:
            detail["status"] = "partial"
            detail["error"] = f"skipped {skipped} incomplete feed entries"
        elif entries:
            detail["status"] = "failed"
            detail["error"] = "feed contains no complete news entries"
        else:
            detail["status"] = "failed"
        if not entries:
            detail["error"] = "feed contains no entries"
        return detail, articles

    def _write_log(
        self,
        session: Session,
        result: CollectionResult,
        trigger: str,
        started_at: datetime,
        started_perf: float,
        *,
        finished_at: datetime | None = None,
    ) -> None:
        finished = finished_at or datetime.now(UTC)
        session.add(
            CollectionLog(
                run_id=result.run_id,
                source_id=result.source_id,
                action="collect",
                trigger=trigger,
                status=result.status,
                http_status=result.http_status,
                items_seen=result.items_seen,
                items_inserted=result.items_inserted,
                items_updated=result.items_updated,
                error_message=result.error,
                details_json={
                    **result.details,
                    "items_skipped": result.items_skipped,
                },
                started_at=started_at,
                finished_at=finished,
                duration_ms=int((time.perf_counter() - started_perf) * 1000),
            )
        )
        session.commit()


def _article_id(source_id: str, external_id: str) -> str:
    digest = hashlib.sha256(f"{source_id}|{external_id}".encode()).hexdigest()
    return f"news_{digest[:32]}"


def _optional_int(value: object) -> int | None:
    return value if isinstance(value, int) else None
