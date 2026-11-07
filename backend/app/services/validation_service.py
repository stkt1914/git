from dataclasses import asdict

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models.news import NewsSource, SourceValidation
from app.services.source_registry import source_definition_from_model
from app.services.source_validator import SourceValidationReport, SourceValidator


async def validate_source_and_record(
    *,
    source_id: str,
    session_factory: sessionmaker[Session],
    validator: SourceValidator,
) -> SourceValidationReport:
    with session_factory() as session:
        source = session.get(NewsSource, source_id)
        if source is None:
            raise LookupError(f"source not found: {source_id}")
        definition = source_definition_from_model(source)

    report = await validator.validate_source(definition)

    with session_factory() as session:
        source = session.get(NewsSource, source_id)
        if source is None:
            raise LookupError(f"source not found: {source_id}")

        for result in report.results:
            session.add(
                SourceValidation(
                    source_id=source_id,
                    endpoint_url=result.endpoint_url,
                    endpoint_kind=result.endpoint_kind,
                    checked_at=report.checked_at,
                    status=result.status,
                    http_status=result.http_status,
                    content_type=result.content_type,
                    feed_format=result.feed_format,
                    xml_valid=result.xml_valid,
                    item_count=result.item_count,
                    latest_published_at=result.latest_published_at,
                    has_title=result.has_title,
                    has_original_url=result.has_original_url,
                    has_published_at=result.has_published_at,
                    success=result.success,
                    restricted=result.restricted,
                    error_message=result.error_message,
                    final_url=result.final_url,
                    duration_ms=result.duration_ms,
                )
            )

        source.last_checked_at = report.checked_at
        source.last_http_status = next(
            (
                result.http_status
                for result in reversed(report.results)
                if result.http_status is not None
            ),
            None,
        )
        source.last_validation_status = report.status
        source.latest_item_published_at = report.latest_published_at
        source.last_error = next(
            (result.error_message for result in report.results if result.error_message is not None),
            None,
        )
        session.commit()

    return report


def validation_report_to_dict(report: SourceValidationReport) -> dict[str, object]:
    return {
        "source_id": report.source_id,
        "source_name": report.source_name,
        "source_type": report.source_type,
        "status": report.status,
        "success": report.success,
        "checked_at": report.checked_at,
        "latest_published_at": report.latest_published_at,
        "results": [asdict(result) for result in report.results],
    }


async def validate_all_sources(
    *,
    session_factory: sessionmaker[Session],
    validator: SourceValidator,
) -> list[SourceValidationReport]:
    with session_factory() as session:
        source_ids = list(session.scalars(select(NewsSource.id).order_by(NewsSource.id)))
    reports: list[SourceValidationReport] = []
    for source_id in source_ids:
        reports.append(
            await validate_source_and_record(
                source_id=source_id,
                session_factory=session_factory,
                validator=validator,
            )
        )
    return reports
