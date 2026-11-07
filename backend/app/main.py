import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.config.settings import Settings
from app.config.settings import settings as default_settings
from app.config.source_catalog import load_source_catalog
from app.db.base import (
    create_database_engine,
    create_session_factory,
    init_database,
)
from app.services.collection_service import CollectionService
from app.services.scheduler import build_scheduler
from app.services.source_registry import seed_source_catalog
from app.services.source_validator import SourceValidator

APP_VERSION = "0.1.0"
DEFAULT_CORS_ORIGINS = "http://localhost:3000"
logger = logging.getLogger(__name__)


def create_app(app_settings: Settings | None = None) -> FastAPI:
    current_settings = app_settings or default_settings
    engine = create_database_engine(current_settings.database_url)
    session_factory = create_session_factory(engine)
    source_validator = SourceValidator(
        user_agent=current_settings.user_agent,
        default_timeout_seconds=current_settings.http_timeout_seconds,
    )
    collection_service = CollectionService(
        session_factory=session_factory,
        user_agent=current_settings.user_agent,
        default_timeout_seconds=current_settings.http_timeout_seconds,
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(name)s %(message)s",
        )
        init_database(engine)
        catalog = load_source_catalog(current_settings.source_config_path)
        with session_factory() as session:
            seeded = seed_source_catalog(session, catalog)
        logger.info("source catalog synchronized: %s sources", seeded)

        scheduler = None
        if current_settings.scheduler_enabled:
            scheduler = build_scheduler(
                collection_service,
                interval_minutes=current_settings.collection_interval_minutes,
            )
            scheduler.start()
            app.state.scheduler = scheduler
            logger.info(
                "collection scheduler started: interval=%s minutes",
                current_settings.collection_interval_minutes,
            )

        try:
            yield
        finally:
            if scheduler is not None and scheduler.running:
                scheduler.shutdown(wait=False)
            engine.dispose()

    app = FastAPI(
        title="智览时政 API",
        version=APP_VERSION,
        description="海内外新闻智能聚合与多视角分析平台 API",
        lifespan=lifespan,
    )
    app.state.settings = current_settings
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.source_validator = source_validator
    app.state.collection_service = collection_service
    app.state.scheduler = None

    cors_origins = [
        origin.strip()
        for origin in os.getenv("API_CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": f"http_{exc.status_code}",
                    "message": str(exc.detail),
                    "details": {},
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed",
                    "details": {"errors": exc.errors()},
                }
            },
        )

    @app.get("/api/v1/health", tags=["system"], summary="服务健康检查")
    def health_check() -> dict[str, str]:
        return {
            "status": "ok",
            "service": "zhilan-api",
            "version": APP_VERSION,
        }

    app.include_router(api_router)
    return app


app = create_app()
