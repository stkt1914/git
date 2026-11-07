from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.db.session import DbSession
from app.models.news import NewsItem
from app.schemas.news import NewsListResponse, NewsOut

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", response_model=NewsListResponse, summary="已采集新闻列表")
def list_news(
    session: DbSession,
    limit: int = Query(default=30, ge=1, le=100),
    category: str | None = None,
    source_id: str | None = None,
    language: str | None = None,
) -> NewsListResponse:
    statement = select(NewsItem).order_by(NewsItem.published_at.desc(), NewsItem.id.desc())
    if category:
        statement = statement.where(NewsItem.category == category)
    if source_id:
        statement = statement.where(NewsItem.source_id == source_id)
    if language:
        statement = statement.where(NewsItem.language == language)
    items = session.scalars(statement.limit(limit)).all()
    return NewsListResponse(
        items=[NewsOut.model_validate(item) for item in items],
        next_cursor=None,
    )


@router.get("/{news_id}", response_model=NewsOut, summary="新闻详情")
def get_news(
    news_id: str,
    session: DbSession,
) -> NewsOut:
    item = session.get(NewsItem, news_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"news not found: {news_id}")
    return NewsOut.model_validate(item)
