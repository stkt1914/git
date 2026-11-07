from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, PlainSerializer

from app.lib.time import as_utc

UtcDateTime = Annotated[
    datetime,
    PlainSerializer(
        lambda value: as_utc(value).isoformat().replace("+00:00", "Z"),
        return_type=str,
        when_used="json",
    ),
]


class FeedOut(BaseModel):
    url: str
    format: str
    category: str | None = None


class SourceOut(BaseModel):
    id: str
    name: str
    publisher: str
    source_type: str
    homepage_url: str
    language: str
    country_or_region: str
    default_category: str
    collection_method: str
    enabled: bool
    paused: bool
    feeds: list[FeedOut]
    terms_url: str | None
    terms_status: str
    copyright_status: str
    image_usage_status: str
    collect_content: bool
    allow_html_scraping: bool
    last_http_status: int | None
    last_validation_status: str
    last_checked_at: UtcDateTime | None
    latest_item_published_at: UtcDateTime | None
    last_collected_at: UtcDateTime | None
    last_success_at: UtcDateTime | None
    last_error: str | None
    notes: str


class SourceListResponse(BaseModel):
    items: list[SourceOut]
    total: int


class EndpointValidationOut(BaseModel):
    endpoint_url: str
    endpoint_kind: str
    status: str
    http_status: int | None
    content_type: str | None
    feed_format: str | None
    xml_valid: bool | None
    item_count: int
    latest_published_at: UtcDateTime | None
    has_title: bool
    has_original_url: bool
    has_published_at: bool
    success: bool
    restricted: bool
    error_message: str | None
    final_url: str | None
    duration_ms: int | None


class SourceValidationResponse(BaseModel):
    source_id: str
    source_name: str
    source_type: str
    status: str
    success: bool
    checked_at: UtcDateTime
    latest_published_at: UtcDateTime | None
    results: list[EndpointValidationOut]


class SourceEndpointStatusOut(BaseModel):
    endpoint_url: str
    status: str
    http_status: int | None
    checked_at: UtcDateTime
    latest_published_at: UtcDateTime | None
    success: bool
    error_message: str | None


class SourceStatusOut(BaseModel):
    id: str
    name: str
    source_type: str
    enabled: bool
    paused: bool
    validation_status: str
    last_checked_at: UtcDateTime | None
    last_collected_at: UtcDateTime | None
    last_success_at: UtcDateTime | None
    latest_item_published_at: UtcDateTime | None
    last_error: str | None
    endpoints: list[SourceEndpointStatusOut]


class SourceStatusListResponse(BaseModel):
    items: list[SourceStatusOut]


class CollectionResultOut(BaseModel):
    run_id: str
    source_id: str
    status: str
    items_seen: int
    items_inserted: int
    items_updated: int
    items_skipped: int
    http_status: int | None
    error: str | None
    details: dict[str, Any]


class CollectionRunRequest(BaseModel):
    source_ids: list[str] | None = None


class CollectionRunResponse(BaseModel):
    run_id: str
    results: list[CollectionResultOut]
    total_seen: int
    total_inserted: int
    total_updated: int


class CollectionLogOut(BaseModel):
    id: int
    run_id: str
    source_id: str | None
    action: str
    trigger: str
    status: str
    http_status: int | None
    items_seen: int
    items_inserted: int
    items_updated: int
    error_message: str | None
    details: dict[str, Any]
    started_at: UtcDateTime
    finished_at: UtcDateTime | None
    duration_ms: int | None


class CollectionLogListResponse(BaseModel):
    items: list[CollectionLogOut]


class NewsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    summary: str
    content: str | None
    original_url: str
    source_id: str
    source_name: str
    publisher: str
    language: str
    country_or_region: str
    published_at: UtcDateTime
    collected_at: UtcDateTime
    category: str
    image_url: str | None
    collection_method: str
    content_license_status: str


class NewsListResponse(BaseModel):
    items: list[NewsOut]
    next_cursor: str | None = None
