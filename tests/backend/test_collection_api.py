import httpx
from app.models.news import CollectionLog, NewsItem
from app.services.http_client import FetchResult
from sqlalchemy import func, select

SAMPLE_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>BBC World</title>
    <item>
      <guid>bbc-test-one</guid>
      <title>Verified test headline</title>
      <link>https://www.bbc.com/news/world-test-one</link>
      <description>RSS metadata summary.</description>
      <pubDate>Sat, 08 Nov 2026 08:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""


def install_fake_feed(monkeypatch) -> None:
    async def fake_fetch(url: str, **_kwargs):
        response = httpx.Response(
            status_code=200,
            headers={"content-type": "text/xml"},
            content=SAMPLE_RSS.encode(),
            request=httpx.Request("GET", url),
        )
        return FetchResult(
            response=response,
            status_code=200,
            error=None,
            restricted=False,
            duration_ms=1,
        )

    monkeypatch.setattr("app.services.collection_service.fetch_url", fake_fetch)
    monkeypatch.setattr("app.services.source_validator.fetch_url", fake_fetch)


def test_sources_endpoint_lists_catalog(client) -> None:
    response = client.get("/api/v1/sources")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 15
    assert any(source["id"] == "bbc_world" for source in payload["items"])


def test_collect_insert_dedup_and_news_api(client, test_app, monkeypatch) -> None:
    install_fake_feed(monkeypatch)

    first = client.post("/api/v1/sources/bbc_world/collect")
    assert first.status_code == 200
    assert first.json()["items_inserted"] == 1

    second = client.post("/api/v1/sources/bbc_world/collect")
    assert second.status_code == 200
    assert second.json()["items_updated"] == 1

    news_response = client.get("/api/v1/news")
    assert news_response.status_code == 200
    news = news_response.json()["items"]
    assert len(news) == 1
    assert news[0]["title"] == "Verified test headline"
    assert news[0]["content"] is None
    assert news[0]["image_url"] is None
    assert news[0]["original_url"] == "https://www.bbc.com/news/world-test-one"
    assert news[0]["published_at"].endswith("Z")

    with test_app.state.session_factory() as session:
        assert session.scalar(select(func.count()).select_from(NewsItem)) == 1
        assert session.scalar(select(func.count()).select_from(CollectionLog)) >= 2


def test_pause_resume_and_collection_logs(client, monkeypatch) -> None:
    install_fake_feed(monkeypatch)

    paused = client.post("/api/v1/sources/bbc_world/pause")
    assert paused.status_code == 200
    assert paused.json()["paused"] is True

    blocked = client.post("/api/v1/sources/bbc_world/collect")
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "http_409"

    resumed = client.post("/api/v1/sources/bbc_world/resume")
    assert resumed.status_code == 200
    assert resumed.json()["paused"] is False

    logs = client.get("/api/v1/collection/logs?source_id=bbc_world")
    assert logs.status_code == 200
    actions = {item["action"] for item in logs.json()["items"]}
    assert {"pause", "resume"}.issubset(actions)


def test_validate_endpoint_records_results(client, monkeypatch) -> None:
    install_fake_feed(monkeypatch)

    response = client.post("/api/v1/sources/bbc_world/validate")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "valid"
    assert payload["results"][0]["item_count"] == 1

    status_response = client.get("/api/v1/sources/status")
    assert status_response.status_code == 200
    bbc_status = next(
        item for item in status_response.json()["items"] if item["id"] == "bbc_world"
    )
    assert bbc_status["validation_status"] == "valid"
    assert len(bbc_status["endpoints"]) == 1


def test_collection_run_and_missing_source_error(client, monkeypatch) -> None:
    install_fake_feed(monkeypatch)

    response = client.post(
        "/api/v1/collection/run",
        json={"source_ids": ["bbc_world", "guardian_world"]},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_inserted"] == 2
    assert {item["source_id"] for item in payload["results"]} == {
        "bbc_world",
        "guardian_world",
    }

    missing = client.post("/api/v1/sources/not_found/collect")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "http_404"


def test_validation_error_uses_standard_error_envelope(client) -> None:
    response = client.get("/api/v1/news?limit=0")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
