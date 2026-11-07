import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

APP_VERSION = "0.1.0"
DEFAULT_CORS_ORIGINS = "http://localhost:3000"

cors_origins = [
    origin.strip()
    for origin in os.getenv("API_CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]

app = FastAPI(
    title="智览时政 API",
    version=APP_VERSION,
    description="海内外新闻智能聚合与多视角分析平台 API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/v1/health", tags=["system"], summary="服务健康检查")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "zhilan-api",
        "version": APP_VERSION,
    }

