import httpx
from app.services import http_client


async def test_fetch_retries_transient_server_errors(monkeypatch) -> None:
    calls = 0

    class FakeAsyncClient:
        def __init__(self, **_kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args) -> None:
            return None

        async def get(self, url: str) -> httpx.Response:
            nonlocal calls
            calls += 1
            status_code = 503 if calls < 3 else 200
            return httpx.Response(
                status_code=status_code,
                content=b"<rss/>",
                request=httpx.Request("GET", url),
            )

    async def no_sleep(_seconds: float) -> None:
        return None

    monkeypatch.setattr(http_client.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(http_client.asyncio, "sleep", no_sleep)

    result = await http_client.fetch_url(
        "https://example.com/rss.xml",
        timeout_seconds=2,
        retry_count=2,
        user_agent="test",
    )

    assert result.response is not None
    assert result.status_code == 200
    assert calls == 3


async def test_fetch_stops_retrying_on_forbidden(monkeypatch) -> None:
    calls = 0

    class FakeAsyncClient:
        def __init__(self, **_kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args) -> None:
            return None

        async def get(self, url: str) -> httpx.Response:
            nonlocal calls
            calls += 1
            return httpx.Response(
                status_code=403,
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr(http_client.httpx, "AsyncClient", FakeAsyncClient)

    result = await http_client.fetch_url(
        "https://example.com/",
        timeout_seconds=2,
        retry_count=2,
        user_agent="test",
    )

    assert result.restricted is True
    assert result.status_code == 403
    assert calls == 1
