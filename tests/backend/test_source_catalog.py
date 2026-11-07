from app.config.source_catalog import load_source_catalog


def test_catalog_has_verified_source_types(test_settings) -> None:
    catalog = load_source_catalog(test_settings.source_config_path)

    assert len(catalog.sources) == 15
    rss_sources = [source for source in catalog.sources if source.source_type == "rss"]
    webpage_sources = [
        source for source in catalog.sources if source.source_type == "webpage"
    ]
    assert len(rss_sources) == 11
    assert len(webpage_sources) == 4
    assert len({source.id for source in catalog.sources}) == 15


def test_catalog_keeps_unverified_pages_disabled(test_settings) -> None:
    catalog = load_source_catalog(test_settings.source_config_path)
    webpage_sources = [
        source for source in catalog.sources if source.source_type == "webpage"
    ]

    assert all(source.enabled is False for source in webpage_sources)
    assert all(source.collection_method == "disabled" for source in webpage_sources)
    assert all(source.allow_html_scraping is False for source in webpage_sources)
    assert all(source.collect_content is False for source in catalog.sources)


def test_xinhua_feed_urls_come_from_official_directory(test_settings) -> None:
    catalog = load_source_catalog(test_settings.source_config_path)
    xinhua = next(source for source in catalog.sources if source.id == "xinhua_english")

    assert xinhua.homepage_url == "https://www.xinhuanet.com/english/rss/"
    assert len(xinhua.feeds) == 4
    assert all(
        feed.url.startswith("https://www.xinhuanet.com/english/rss/")
        for feed in xinhua.feeds
    )
