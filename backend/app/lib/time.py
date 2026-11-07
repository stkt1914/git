import re
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime

from bs4 import BeautifulSoup


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def datetime_from_struct_time(value: object) -> datetime | None:
    if not isinstance(value, tuple) or len(value) < 6:
        return None
    try:
        return datetime(
            year=int(value[0]),
            month=int(value[1]),
            day=int(value[2]),
            hour=int(value[3]),
            minute=int(value[4]),
            second=int(value[5]),
            tzinfo=UTC,
        )
    except (TypeError, ValueError):
        return None


def parse_datetime_text(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
        return as_utc(parsed)
    except (TypeError, ValueError, OverflowError):
        pass

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return as_utc(parsed)
    except ValueError:
        return None


def clean_text(value: str | None, *, max_length: int = 4000) -> str:
    if not value:
        return ""
    text = BeautifulSoup(value, "html.parser").get_text(" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_length]
