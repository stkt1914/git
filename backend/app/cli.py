import argparse
import asyncio
import json
from dataclasses import asdict

from sqlalchemy import select

from app.config.settings import settings
from app.config.source_catalog import load_source_catalog
from app.db.base import (
    create_database_engine,
    create_session_factory,
    init_database,
)
from app.models.news import NewsSource
from app.services.collection_service import CollectionService
from app.services.source_registry import seed_source_catalog
from app.services.source_validator import SourceValidator
from app.services.validation_service import validate_source_and_record


def main() -> None:
    parser = argparse.ArgumentParser(description="智览时政采集工具")
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser("validate", help="验证新闻来源")
    validate_parser.add_argument("source_id", nargs="?")
    validate_parser.add_argument("--all", action="store_true")

    collect_parser = subparsers.add_parser("collect", help="采集新闻来源")
    collect_parser.add_argument("source_id", nargs="?")
    collect_parser.add_argument("--all", action="store_true")

    subparsers.add_parser("list-sources", help="列出新闻来源")

    args = parser.parse_args()
    engine = create_database_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    init_database(engine)
    catalog = load_source_catalog(settings.source_config_path)
    with session_factory() as session:
        seed_source_catalog(session, catalog)

    if args.command == "validate":
        asyncio.run(_validate(args, session_factory))
    elif args.command == "collect":
        asyncio.run(_collect(args, session_factory))
    else:
        _list_sources(session_factory)

    engine.dispose()


async def _validate(args: argparse.Namespace, session_factory: object) -> None:
    source_ids = _resolve_source_ids(args, session_factory)
    validator = SourceValidator(
        user_agent=settings.user_agent,
        default_timeout_seconds=settings.http_timeout_seconds,
    )
    reports = []
    for source_id in source_ids:
        report = await validate_source_and_record(
            source_id=source_id,
            session_factory=session_factory,
            validator=validator,
        )
        reports.append(asdict(report))
    print(json.dumps(reports, ensure_ascii=False, indent=2, default=str))


async def _collect(args: argparse.Namespace, session_factory: object) -> None:
    service = CollectionService(
        session_factory=session_factory,
        user_agent=settings.user_agent,
        default_timeout_seconds=settings.http_timeout_seconds,
    )
    if getattr(args, "all", False):
        results = await service.collect_all(trigger="cli")
    else:
        if not args.source_id:
            raise SystemExit("source_id is required unless --all is used")
        results = [await service.collect_source(args.source_id, trigger="cli")]
    print(
        json.dumps(
            [asdict(result) for result in results],
            ensure_ascii=False,
            indent=2,
            default=str,
        )
    )


def _list_sources(session_factory: object) -> None:
    with session_factory() as session:  # type: ignore[operator]
        sources = session.scalars(select(NewsSource).order_by(NewsSource.id)).all()
        print(
            json.dumps(
                [
                    {
                        "id": source.id,
                        "name": source.name,
                        "source_type": source.source_type,
                        "enabled": source.is_enabled,
                        "paused": source.is_paused,
                        "feeds": source.feeds_json,
                    }
                    for source in sources
                ],
                ensure_ascii=False,
                indent=2,
            )
        )


def _resolve_source_ids(args: argparse.Namespace, session_factory: object) -> list[str]:
    if getattr(args, "all", False):
        with session_factory() as session:  # type: ignore[operator]
            return list(session.scalars(select(NewsSource.id).order_by(NewsSource.id)))
    if not args.source_id:
        raise SystemExit("source_id is required unless --all is used")
    return [args.source_id]


if __name__ == "__main__":
    main()
