from fastapi import APIRouter

from app.api.routes import collection, news, sources

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(sources.router)
api_router.include_router(collection.router)
api_router.include_router(news.router)
