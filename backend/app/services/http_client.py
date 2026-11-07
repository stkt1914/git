import asyncio
import time
from dataclasses import dataclass

import httpx


@dataclass(slots=True)
class FetchResult:
    response: httpx.Response | None
    status_code: int | None
    error: str | None
    restricted: bool
    duration_ms: int


async def fetch_url(
    url: str,
    *,
    timeout_seconds: float,
    retry_count: int,
    user_agent: str,
) -> FetchResult:
    started = time.perf_counter()
    headers = {
        "User-Agent": user_agent,
        "Accept": (
            "application/rss+xml, application/atom+xml, application/xml, "
            "text/xml, text/html;q=0.8, */*;q=0.5"
        ),
    }
    timeout = httpx.Timeout(max(1.0, timeout_seconds), connect=10.0)
    last_error: str | None = None
    last_status: int | None = None

    async with httpx.AsyncClient(
        headers=headers,
        follow_redirects=True,
        timeout=timeout,
    ) as client:
        for attempt in range(retry_count + 1):
            try:
                response = await client.get(url)
                last_status = response.status_code
                if response.status_code < 400:
                    return FetchResult(
                        response=response,
                        status_code=response.status_code,
                        error=None,
                        restricted=False,
                        duration_ms=int((time.perf_counter() - started) * 1000),
                    )

                last_error = f"HTTP {response.status_code}"
                if response.status_code in {401, 403, 429}:
                    return FetchResult(
                        response=None,
                        status_code=response.status_code,
                        error=last_error,
                        restricted=True,
                        duration_ms=int((time.perf_counter() - started) * 1000),
                    )
                if response.status_code < 500 or attempt >= retry_count:
                    break
            except httpx.RequestError as exc:
                last_error = f"{exc.__class__.__name__}: {exc}"
                if attempt >= retry_count:
                    break

            await asyncio.sleep(min(2.0, 0.35 * (2**attempt)))

    return FetchResult(
        response=None,
        status_code=last_status,
        error=last_error or "request failed",
        restricted=False,
        duration_ms=int((time.perf_counter() - started) * 1000),
    )
