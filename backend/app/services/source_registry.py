from sqlalchemy.orm import Session

from app.config.source_catalog import (
    FeedDefinition,
    NewsSourceDefinition,
    SourceCatalog,
)
from app.models.news import NewsSource


def seed_source_catalog(session: Session, catalog: SourceCatalog) -> int:
    count = 0
    for definition in catalog.sources:
        source = session.get(NewsSource, definition.id)
        if source is None:
            source = NewsSource(id=definition.id, is_paused=False)
            session.add(source)

        source.name = definition.name
        source.publisher = definition.publisher
        source.source_type = definition.source_type
        source.homepage_url = definition.homepage_url
        source.language = definition.language
        source.country_or_region = definition.country_or_region
        source.default_category = definition.default_category
        source.collection_method = definition.collection_method
        source.is_enabled = definition.enabled
        source.feeds_json = [feed.model_dump(mode="json") for feed in definition.feeds]
        source.terms_url = definition.terms_url
        source.terms_status = definition.terms_status
        source.copyright_status = definition.copyright_status
        source.image_usage_status = definition.image_usage_status
        source.collect_content = definition.collect_content
        source.allow_html_scraping = definition.allow_html_scraping
        source.timeout_seconds = definition.timeout_seconds
        source.retry_count = definition.retry_count
        source.max_items = definition.max_items
        source.notes = definition.notes
        count += 1

    session.commit()
    return count


def source_definition_from_model(source: NewsSource) -> NewsSourceDefinition:
    return NewsSourceDefinition(
        id=source.id,
        name=source.name,
        publisher=source.publisher,
        source_type=source.source_type,
        homepage_url=source.homepage_url,
        language=source.language,
        country_or_region=source.country_or_region,
        default_category=source.default_category,
        collection_method=source.collection_method,
        enabled=source.is_enabled,
        feeds=[FeedDefinition.model_validate(feed) for feed in source.feeds_json],
        terms_url=source.terms_url,
        terms_status=source.terms_status,
        copyright_status=source.copyright_status,
        image_usage_status=source.image_usage_status,
        collect_content=source.collect_content,
        allow_html_scraping=source.allow_html_scraping,
        timeout_seconds=source.timeout_seconds,
        retry_count=source.retry_count,
        max_items=source.max_items,
        notes=source.notes,
    )
