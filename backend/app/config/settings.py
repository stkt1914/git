import os
from dataclasses import dataclass
from pathlib import Path


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class Settings:
    app_env: str
    database_url: str
    source_config_path: Path
    scheduler_enabled: bool
    collection_interval_minutes: int
    http_timeout_seconds: float
    user_agent: str

    @classmethod
    def from_env(cls) -> "Settings":
        config_dir = Path(__file__).resolve().parent
        return cls(
            app_env=os.getenv("APP_ENV", "development"),
            database_url=os.getenv("DATABASE_URL", "sqlite:///./data/zhilan.db"),
            source_config_path=Path(
                os.getenv("NEWS_SOURCE_CONFIG", config_dir / "news_sources.yaml")
            ).resolve(),
            scheduler_enabled=_as_bool(os.getenv("NEWS_SCHEDULER_ENABLED"), default=True),
            collection_interval_minutes=max(
                1, int(os.getenv("NEWS_COLLECTION_INTERVAL_MINUTES", "60"))
            ),
            http_timeout_seconds=max(1.0, float(os.getenv("NEWS_HTTP_TIMEOUT_SECONDS", "20"))),
            user_agent=os.getenv(
                "NEWS_HTTP_USER_AGENT",
                "Zhilan-Shizheng/0.1 (+local-development)",
            ),
        )


settings = Settings.from_env()
