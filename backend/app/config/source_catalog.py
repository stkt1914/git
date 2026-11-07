from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator


class FeedDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str
    format: Literal["rss", "atom", "auto"] = "auto"
    category: str | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        if not value.startswith(("http://", "https://")):
            raise ValueError("feed URL must use http or https")
        return value


class NewsSourceDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9_]+$")
    name: str
    publisher: str
    source_type: Literal["rss", "atom", "api", "webpage"]
    homepage_url: str
    language: str
    country_or_region: str
    default_category: str
    collection_method: Literal["rss", "atom", "api", "webpage", "disabled"]
    enabled: bool = False
    feeds: list[FeedDefinition] = Field(default_factory=list)
    terms_url: str | None = None
    terms_status: str = "review_required"
    copyright_status: str = "unknown"
    image_usage_status: str = "unknown"
    collect_content: bool = False
    allow_html_scraping: bool = False
    timeout_seconds: float = 20.0
    retry_count: int = 2
    max_items: int = 40
    notes: str = ""

    @field_validator("homepage_url")
    @classmethod
    def validate_homepage_url(cls, value: str) -> str:
        if not value.startswith(("http://", "https://")):
            raise ValueError("homepage URL must use http or https")
        return value

    @field_validator("collect_content")
    @classmethod
    def content_requires_permission(cls, value: bool) -> bool:
        if value:
            raise ValueError(
                "collect_content must remain false until a source-specific license review"
            )
        return value

    @field_validator("allow_html_scraping")
    @classmethod
    def html_scraping_requires_permission(cls, value: bool) -> bool:
        if value:
            raise ValueError("allow_html_scraping must remain false until a source-specific review")
        return value


class SourceCatalog(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int
    sources: list[NewsSourceDefinition]

    @field_validator("sources")
    @classmethod
    def source_ids_unique(cls, value: list[NewsSourceDefinition]) -> list[NewsSourceDefinition]:
        ids = [source.id for source in value]
        if len(ids) != len(set(ids)):
            raise ValueError("source ids must be unique")
        return value


def load_source_catalog(path: Path) -> SourceCatalog:
    with path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle)
    return SourceCatalog.model_validate(payload)
