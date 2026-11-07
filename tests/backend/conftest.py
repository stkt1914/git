from pathlib import Path

import pytest
from app.config.settings import Settings
from app.main import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def test_settings(tmp_path: Path) -> Settings:
    project_root = Path(__file__).resolve().parents[2]
    database_path = tmp_path / "test.db"
    return Settings(
        app_env="test",
        database_url=f"sqlite+pysqlite:///{database_path.as_posix()}",
        source_config_path=project_root
        / "backend"
        / "app"
        / "config"
        / "news_sources.yaml",
        scheduler_enabled=False,
        collection_interval_minutes=60,
        http_timeout_seconds=2.0,
        user_agent="Zhilan-Test/0.1",
    )


@pytest.fixture
def test_app(test_settings: Settings):
    return create_app(test_settings)


@pytest.fixture
def client(test_app):
    with TestClient(test_app) as test_client:
        yield test_client
