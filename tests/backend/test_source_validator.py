import httpx
from app.config.source_catalog import FeedDefinition, NewsSourceDefinition
from app.services.http_client import FetchResult
from app.services.source_validator import SourceValidator

RSS_FEED = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example World</title>
    <link>https://example.com/world</link>
    <item>
      <title>Example headline</title>
      <link>https://example.com/news/one</link>
      <description>Example summary</description>
      <pubDate>Sat, 08 Nov 2026 08:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""

ATOM_FEED = """<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom</title>
  <entry>
    <title>Atom headline</title>
    <link href="https://example.com/atom/one"/>
    <updated>2026-11-08T09:00:00Z</updated>
    <summary>Atom summary</summary>
    <id>atom-one</id>
  </entry>
</feed>
"""


def rss_source(url: str = "https://example.com/rss.xml") -> NewsSourceDefinition:
    return NewsSourceDefinition(
        id="example_rss",
        name="Example RSS",
        publisher="Example Publisher",
        source_type="rss",
        homepage_url="https://example.com/",
        language="en",
        country_or_region="Global",
        default_category="politics",
        collection_method="rss",
        enabled=True,
        feeds=[FeedDefinition(url=url, format="rss", category="politics")],
        terms_status="rss_metadata_only_pending_review",
        copyright_status="publisher_owned_metadata_only",
        image_usage_status="not_used",
    )


def fetch_result(
    *,
    content: bytes,
    content_type: str,
    status_code: int = 200,
    url: str = "https://example.com/rss.xml",
) -> FetchResult:
    response = httpx.Response(
        status_code=status_code,
        headers={"content-type": content_type},
        content=content,
        request=httpx.Request("GET", url),
    )
    return FetchResult(
        response=response,
        status_code=status_code,
        error=None,
        restricted=False,
        duration_ms=1,
    )


async def test_valid_rss_feed(monkeypatch) -> None:
    async def fake_fetch(*_args, **_kwargs):
        return fetch_result(content=RSS_FEED.encode(), content_type="text/xml")

    monkeypatch.setattr("app.services.source_validator.fetch_url", fake_fetch)
    validator = SourceValidator(user_agent="test", default_timeout_seconds=2.0)

    report = await validator.validate_source(rss_source())

    assert report.status == "valid"
    assert report.success is True
    assert report.results[0].feed_format == "rss"
    assert report.results[0].item_count == 1
    assert report.results[0].has_published_at is True


async def test_valid_atom_feed(monkeypatch) -> None:
    async def fake_fetch(*_args, **_kwargs):
        return fetch_result(
            content=ATOM_FEED.encode(),
            content_type="application/atom+xml",
        )

    monkeypatch.setattr("app.services.source_validator.fetch_url", fake_fetch)
    validator = SourceValidator(user_agent="test", default_timeout_seconds=2.0)

    report = await validator.validate_source(rss_source())

    assert report.status == "valid"
    assert report.results[0].feed_format == "atom"


async def test_http_200_with_malformed_xml_is_not_valid(monkeypatch) -> None:
    async def fake_fetch(*_args, **_kwargs):
        return fetch_result(
            content=b"<rss><channel><item>broken",
            content_type="text/xml",
        )

    monkeypatch.setattr("app.services.source_validator.fetch_url", fake_fetch)
    validator = SourceValidator(user_agent="test", default_timeout_seconds=2.0)

    report = await validator.validate_source(rss_source())

    assert report.success is False
    assert report.results[0].xml_valid is False


async def test_stale_feed_is_not_valid(monkeypatch) -> None:
    stale_feed = RSS_FEED.replace(
        "Sat, 08 Nov 2026 08:00:00 GMT",
        "Wed, 01 Jan 2020 08:00:00 GMT",
    )

    async def fake_fetch(*_args, **_kwargs):
        return fetch_result(content=stale_feed.encode(), content_type="text/xml")

    monkeypatch.setattr("app.services.source_validator.fetch_url", fake_fetch)
    validator = SourceValidator(user_agent="test", default_timeout_seconds=2.0)

    report = await validator.validate_source(rss_source())

    assert report.status == "stale"
    assert report.results[0].success is False


async def test_restricted_webpage_is_reported(monkeypatch) -> None:
    async def fake_fetch(*_args, **_kwargs):
        return FetchResult(
            response=None,
            status_code=403,
            error="HTTP 403",
            restricted=True,
            duration_ms=1,
        )

    monkeypatch.setattr("app.services.source_validator.fetch_url", fake_fetch)
    source = NewsSourceDefinition(
        id="example_page",
        name="Example Page",
        publisher="Example",
        source_type="webpage",
        homepage_url="https://example.com/news",
        language="en",
        country_or_region="Global",
        default_category="politics",
        collection_method="disabled",
        enabled=False,
        terms_status="review_required",
        copyright_status="unknown",
        image_usage_status="not_used",
    )
    validator = SourceValidator(user_agent="test", default_timeout_seconds=2.0)

    report = await validator.validate_source(source)

    assert report.status == "restricted"
    assert report.results[0].restricted is True
