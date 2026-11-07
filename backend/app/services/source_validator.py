import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import UTC, datetime

import feedparser
from bs4 import BeautifulSoup

from app.config.source_catalog import FeedDefinition, NewsSourceDefinition
from app.lib.time import datetime_from_struct_time, parse_datetime_text
from app.services.http_client import fetch_url

STALE_AFTER_DAYS = 30


@dataclass(slots=True)
class EndpointValidation:
    endpoint_url: str
    endpoint_kind: str
    status: str
    http_status: int | None = None
    content_type: str | None = None
    feed_format: str | None = None
    xml_valid: bool | None = None
    item_count: int = 0
    latest_published_at: datetime | None = None
    has_title: bool = False
    has_original_url: bool = False
    has_published_at: bool = False
    success: bool = False
    restricted: bool = False
    error_message: str | None = None
    final_url: str | None = None
    duration_ms: int | None = None


@dataclass(slots=True)
class SourceValidationReport:
    source_id: str
    source_name: str
    source_type: str
    status: str
    success: bool
    checked_at: datetime
    latest_published_at: datetime | None
    results: list[EndpointValidation] = field(default_factory=list)


class SourceValidator:
    def __init__(self, *, user_agent: str, default_timeout_seconds: float) -> None:
        self.user_agent = user_agent
        self.default_timeout_seconds = default_timeout_seconds

    async def validate_source(self, source: NewsSourceDefinition) -> SourceValidationReport:
        checked_at = datetime.now(UTC)
        results: list[EndpointValidation] = []

        if source.feeds:
            for feed in source.feeds:
                results.append(await self._validate_feed(source, feed))
        else:
            results.append(await self._validate_webpage(source))

        success = any(result.success for result in results)
        if success and source.feeds:
            status = "valid"
        elif success:
            status = "available_webpage"
        elif any(result.status == "stale" for result in results):
            status = "stale"
        elif results and all(result.restricted for result in results):
            status = "restricted"
        else:
            status = "invalid"

        latest = max(
            (
                result.latest_published_at
                for result in results
                if result.latest_published_at is not None
            ),
            default=None,
        )
        return SourceValidationReport(
            source_id=source.id,
            source_name=source.name,
            source_type=source.source_type,
            status=status,
            success=success,
            checked_at=checked_at,
            latest_published_at=latest,
            results=results,
        )

    async def _validate_feed(
        self, source: NewsSourceDefinition, feed: FeedDefinition
    ) -> EndpointValidation:
        started = time.perf_counter()
        fetched = await fetch_url(
            feed.url,
            timeout_seconds=source.timeout_seconds or self.default_timeout_seconds,
            retry_count=source.retry_count,
            user_agent=self.user_agent,
        )
        duration_ms = int((time.perf_counter() - started) * 1000)

        if fetched.response is None:
            return EndpointValidation(
                endpoint_url=feed.url,
                endpoint_kind=feed.format,
                status="restricted" if fetched.restricted else "network_error",
                http_status=fetched.status_code,
                restricted=fetched.restricted,
                error_message=fetched.error,
                duration_ms=duration_ms,
            )

        response = fetched.response
        content_type = response.headers.get("content-type")
        payload = response.content
        xml_valid: bool | None = None
        feed_format: str | None = None
        item_count = 0
        latest_published_at: datetime | None = None
        has_title = False
        has_original_url = False
        has_published_at = False
        error_message: str | None = None

        try:
            ET.fromstring(payload)
            xml_valid = True
        except ET.ParseError as exc:
            xml_valid = False
            error_message = f"XML parse error: {exc}"

        parsed = feedparser.parse(
            payload,
            response_headers={"content-type": content_type or ""},
        )
        version = str(parsed.get("version") or "")
        if "atom" in version:
            feed_format = "atom"
        elif "rss" in version or "rdf" in version:
            feed_format = "rss"
        else:
            feed_format = None

        entries = list(parsed.get("entries") or [])
        item_count = len(entries)
        if entries:
            newest = entries[0]
            has_title = bool(str(newest.get("title") or "").strip())
            has_original_url = bool(str(newest.get("link") or "").strip())
            published = entry_datetime(newest)
            has_published_at = published is not None
            latest_published_at = published

            for entry in entries:
                candidate = entry_datetime(entry)
                if candidate and (latest_published_at is None or candidate > latest_published_at):
                    latest_published_at = candidate

        if not xml_valid:
            status = "invalid"
        elif item_count == 0:
            status = "empty"
            error_message = error_message or "feed contains no news items"
        elif not (has_title and has_original_url and has_published_at):
            status = "invalid"
            error_message = (
                error_message or "newest item is missing title, original URL, or published time"
            )
        elif (
            latest_published_at is not None
            and (datetime.now(UTC) - latest_published_at).days > STALE_AFTER_DAYS
        ):
            status = "stale"
            error_message = f"latest feed item is older than {STALE_AFTER_DAYS} days"
        else:
            status = "valid"

        success = status == "valid"
        return EndpointValidation(
            endpoint_url=feed.url,
            endpoint_kind=feed.format,
            status=status,
            http_status=response.status_code,
            content_type=content_type,
            feed_format=feed_format,
            xml_valid=xml_valid,
            item_count=item_count,
            latest_published_at=latest_published_at,
            has_title=has_title,
            has_original_url=has_original_url,
            has_published_at=has_published_at,
            success=success,
            error_message=error_message,
            final_url=str(response.url),
            duration_ms=duration_ms,
        )

    async def _validate_webpage(self, source: NewsSourceDefinition) -> EndpointValidation:
        started = time.perf_counter()
        fetched = await fetch_url(
            source.homepage_url,
            timeout_seconds=source.timeout_seconds or self.default_timeout_seconds,
            retry_count=source.retry_count,
            user_agent=self.user_agent,
        )
        duration_ms = int((time.perf_counter() - started) * 1000)
        if fetched.response is None:
            return EndpointValidation(
                endpoint_url=source.homepage_url,
                endpoint_kind="webpage",
                status="restricted" if fetched.restricted else "network_error",
                http_status=fetched.status_code,
                restricted=fetched.restricted,
                error_message=fetched.error,
                duration_ms=duration_ms,
            )

        response = fetched.response
        content_type = response.headers.get("content-type")
        soup = BeautifulSoup(response.text, "html.parser")
        article_count = len(soup.select("article"))
        time_element = soup.select_one("time[datetime]")
        latest = (
            parse_datetime_text(time_element.get("datetime")) if time_element is not None else None
        )
        title = soup.title.get_text(" ", strip=True) if soup.title else ""
        is_html = "html" in (content_type or "").lower() or bool(soup.html)
        review_required = source.collection_method == "disabled"

        status = "review_required" if is_html and title else "invalid"
        return EndpointValidation(
            endpoint_url=source.homepage_url,
            endpoint_kind="webpage",
            status=status,
            http_status=response.status_code,
            content_type=content_type,
            feed_format="html",
            xml_valid=None,
            item_count=article_count,
            latest_published_at=latest,
            has_title=bool(title),
            has_original_url=True,
            has_published_at=latest is not None,
            success=is_html and bool(title),
            restricted=False,
            error_message=(
                "ordinary web page; collection remains disabled pending terms review"
                if review_required
                else None
            ),
            final_url=str(response.url),
            duration_ms=duration_ms,
        )


def entry_datetime(entry: object) -> datetime | None:
    getter = getattr(entry, "get", None)
    if not callable(getter):
        return None
    for key in ("published_parsed", "updated_parsed"):
        parsed = datetime_from_struct_time(getter(key))
        if parsed:
            return parsed
    for key in ("published", "updated"):
        parsed = parse_datetime_text(getter(key))
        if parsed:
            return parsed
    return None
