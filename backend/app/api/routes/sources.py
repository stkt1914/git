from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import DbSession
from app.models.news import CollectionLog, NewsSource, SourceValidation
from app.schemas.news import (
    CollectionResultOut,
    FeedOut,
    SourceEndpointStatusOut,
    SourceListResponse,
    SourceOut,
    SourceStatusListResponse,
    SourceStatusOut,
    SourceValidationResponse,
)
from app.services.validation_service import (
    validate_source_and_record,
    validation_report_to_dict,
)

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("", response_model=SourceListResponse, summary="新闻来源列表")
def list_sources(
    session: DbSession,
) -> SourceListResponse:
    sources = session.scalars(select(NewsSource).order_by(NewsSource.name)).all()
    items = [_source_to_out(source) for source in sources]
    return SourceListResponse(items=items, total=len(items))


@router.get("/status", response_model=SourceStatusListResponse, summary="来源状态")
def source_status(
    session: DbSession,
) -> SourceStatusListResponse:
    sources = session.scalars(select(NewsSource).order_by(NewsSource.name)).all()
    validations = session.scalars(
        select(SourceValidation).order_by(SourceValidation.checked_at.desc())
    ).all()

    latest_by_endpoint: dict[tuple[str, str], SourceValidation] = {}
    for validation in validations:
        key = (validation.source_id, validation.endpoint_url)
        latest_by_endpoint.setdefault(key, validation)

    items: list[SourceStatusOut] = []
    for source in sources:
        endpoints = [
            SourceEndpointStatusOut(
                endpoint_url=validation.endpoint_url,
                status=validation.status,
                http_status=validation.http_status,
                checked_at=validation.checked_at,
                latest_published_at=validation.latest_published_at,
                success=validation.success,
                error_message=validation.error_message,
            )
            for (source_id, _), validation in latest_by_endpoint.items()
            if source_id == source.id
        ]
        items.append(
            SourceStatusOut(
                id=source.id,
                name=source.name,
                source_type=source.source_type,
                enabled=source.is_enabled,
                paused=source.is_paused,
                validation_status=source.last_validation_status,
                last_checked_at=source.last_checked_at,
                last_collected_at=source.last_collected_at,
                last_success_at=source.last_success_at,
                latest_item_published_at=source.latest_item_published_at,
                last_error=source.last_error,
                endpoints=endpoints,
            )
        )
    return SourceStatusListResponse(items=items)


@router.post(
    "/{source_id}/validate",
    response_model=SourceValidationResponse,
    summary="验证单个新闻来源",
)
async def validate_source(
    source_id: str,
    request: Request,
) -> SourceValidationResponse:
    try:
        report = await validate_source_and_record(
            source_id=source_id,
            session_factory=request.app.state.session_factory,
            validator=request.app.state.source_validator,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return SourceValidationResponse.model_validate(validation_report_to_dict(report))


@router.post(
    "/{source_id}/collect",
    response_model=CollectionResultOut,
    summary="手动采集单个新闻来源",
)
async def collect_source(source_id: str, request: Request) -> CollectionResultOut:
    try:
        result = await request.app.state.collection_service.collect_source(
            source_id,
            trigger="manual",
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if result.status == "skipped":
        raise HTTPException(status_code=409, detail=result.error or "source skipped")
    return CollectionResultOut.model_validate(result, from_attributes=True)


@router.post(
    "/{source_id}/pause",
    response_model=SourceOut,
    summary="暂停新闻来源",
)
def pause_source(
    source_id: str,
    session: DbSession,
) -> SourceOut:
    source = _get_source_or_404(session, source_id)
    source.is_paused = True
    _write_source_action_log(session, source.id, "pause")
    session.commit()
    session.refresh(source)
    return _source_to_out(source)


@router.post(
    "/{source_id}/resume",
    response_model=SourceOut,
    summary="恢复新闻来源",
)
def resume_source(
    source_id: str,
    session: DbSession,
) -> SourceOut:
    source = _get_source_or_404(session, source_id)
    source.is_paused = False
    _write_source_action_log(session, source.id, "resume")
    session.commit()
    session.refresh(source)
    return _source_to_out(source)


def _source_to_out(source: NewsSource) -> SourceOut:
    return SourceOut(
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
        paused=source.is_paused,
        feeds=[FeedOut.model_validate(feed) for feed in source.feeds_json],
        terms_url=source.terms_url,
        terms_status=source.terms_status,
        copyright_status=source.copyright_status,
        image_usage_status=source.image_usage_status,
        collect_content=source.collect_content,
        allow_html_scraping=source.allow_html_scraping,
        last_http_status=source.last_http_status,
        last_validation_status=source.last_validation_status,
        last_checked_at=source.last_checked_at,
        latest_item_published_at=source.latest_item_published_at,
        last_collected_at=source.last_collected_at,
        last_success_at=source.last_success_at,
        last_error=source.last_error,
        notes=source.notes,
    )


def _get_source_or_404(session: Session, source_id: str) -> NewsSource:
    source = session.get(NewsSource, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail=f"source not found: {source_id}")
    return source


def _write_source_action_log(
    session: Session,
    source_id: str,
    action: str,
) -> None:
    now = datetime.now(UTC)
    session.add(
        CollectionLog(
            run_id=str(uuid4()),
            source_id=source_id,
            action=action,
            trigger="manual",
            status="success",
            items_seen=0,
            items_inserted=0,
            items_updated=0,
            details_json={},
            started_at=now,
            finished_at=now,
            duration_ms=0,
        )
    )
