from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import select

from app.db.session import DbSession
from app.models.news import CollectionLog
from app.schemas.news import (
    CollectionLogListResponse,
    CollectionLogOut,
    CollectionResultOut,
    CollectionRunRequest,
    CollectionRunResponse,
)

router = APIRouter(prefix="/collection", tags=["collection"])


@router.post("/run", response_model=CollectionRunResponse, summary="运行采集")
async def run_collection(
    request: Request,
    payload: CollectionRunRequest | None = None,
) -> CollectionRunResponse:
    service = request.app.state.collection_service
    run_id = str(uuid4())

    results = []
    if payload and payload.source_ids:
        for source_id in payload.source_ids:
            try:
                result = await service.collect_source(
                    source_id,
                    trigger="manual",
                    run_id=run_id,
                )
            except LookupError as exc:
                raise HTTPException(status_code=404, detail=str(exc)) from exc
            results.append(result)
    else:
        results = await service.collect_all(trigger="manual")
        if results:
            run_id = results[0].run_id

    return CollectionRunResponse(
        run_id=run_id,
        results=[
            CollectionResultOut.model_validate(result, from_attributes=True) for result in results
        ],
        total_seen=sum(result.items_seen for result in results),
        total_inserted=sum(result.items_inserted for result in results),
        total_updated=sum(result.items_updated for result in results),
    )


@router.get(
    "/logs",
    response_model=CollectionLogListResponse,
    summary="采集日志",
)
def list_collection_logs(
    session: DbSession,
    source_id: str | None = None,
    log_status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
) -> CollectionLogListResponse:
    statement = select(CollectionLog).order_by(CollectionLog.started_at.desc())
    if source_id:
        statement = statement.where(CollectionLog.source_id == source_id)
    if log_status:
        statement = statement.where(CollectionLog.status == log_status)
    logs = session.scalars(statement.limit(limit)).all()
    return CollectionLogListResponse(
        items=[
            CollectionLogOut(
                id=log.id,
                run_id=log.run_id,
                source_id=log.source_id,
                action=log.action,
                trigger=log.trigger,
                status=log.status,
                http_status=log.http_status,
                items_seen=log.items_seen,
                items_inserted=log.items_inserted,
                items_updated=log.items_updated,
                error_message=log.error_message,
                details=log.details_json,
                started_at=log.started_at,
                finished_at=log.finished_at,
                duration_ms=log.duration_ms,
            )
            for log in logs
        ]
    )
