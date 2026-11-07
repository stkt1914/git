"""Persistence model package."""

from app.models.news import CollectionLog, NewsItem, NewsSource, SourceValidation

__all__ = [
    "CollectionLog",
    "NewsItem",
    "NewsSource",
    "SourceValidation",
]
