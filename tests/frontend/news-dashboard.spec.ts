import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("zhilan-followed-events-v1");
  });
});

async function openMobilePreview(page: Page) {
  await page.goto("/");
  const app = page.frameLocator('[data-testid="mobile-preview"]');
  await expect(app.getByTestId("news-card").first()).toBeVisible();
  return app;
}

test("mobile first screen shows a dense demonstration feed", async ({
  page,
}) => {
  const app = await openMobilePreview(page);
  const cards = app.getByTestId("news-card");
  await expect(cards).toHaveCount(6);
  await expect(cards.first()).toContainText("演示");
  await expect(app.getByTestId("data-mode-label")).toContainText("演示样本日");
  await expect(app.locator("header button")).toHaveCount(2);
  await expect(app.getByTestId("open-search")).toHaveCount(0);

  const cardMetrics = await cards.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      const visibleHeight =
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      return {
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        visibleRatio: Math.max(0, Math.min(1, visibleHeight / rect.height)),
      };
    }),
  );
  const visibleCardCount = cardMetrics.filter(
    (card) => card.visibleRatio >= 0.6,
  ).length;

  expect(visibleCardCount).toBeGreaterThanOrEqual(2);
  expect(visibleCardCount).toBeLessThanOrEqual(3);
  test.info().annotations.push({
    type: "card-metrics",
    description: JSON.stringify(cardMetrics),
  });

  const layoutMetrics = await app.locator("body").evaluate(() => ({
    viewportWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  const tabBox = await app.getByTestId("feed-tabs").boundingBox();

  expect(layoutMetrics.documentWidth).toBeLessThanOrEqual(
    layoutMetrics.viewportWidth + 1,
  );
  expect(tabBox).not.toBeNull();
  if (tabBox) {
    expect(
      Math.abs(tabBox.x + tabBox.width / 2 - layoutMetrics.clientWidth / 2),
    ).toBeLessThan(2);
  }

  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: false,
  });
});

test("recommended categories expand and filter the feed", async ({ page }) => {
  const app = await openMobilePreview(page);
  await app.getByTestId("tab-recommended").tap();

  await expect(app.getByTestId("category-panel")).toContainText("全部类型");
  await expect(
    app.getByTestId(/^category-(全部|国际|科技|经济|社会|环境|防务)$/),
  ).toHaveCount(7);
  await expect(app.getByTestId("category-全部")).toBeVisible();
  await expect(app.getByTestId("category-国际")).toBeVisible();
  await expect(app.getByTestId("category-科技")).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-categories.png",
    fullPage: false,
  });

  await app.getByTestId("category-科技").tap();

  await expect(app.getByTestId("news-card")).toHaveCount(1);
  await expect(app.getByTestId("news-card").first()).toContainText("芯片");
});

test("following tab shows the demonstration watchlist and bookmark state", async ({
  page,
}) => {
  const app = await openMobilePreview(page);
  await app.getByTestId("tab-following").tap();

  await expect(app.getByTestId("news-card")).toHaveCount(2);
  await expect(app.getByTestId("news-card").first()).toContainText(
    "多边能源会议",
  );

  await app.getByTestId("follow-demo-event-energy").tap();

  await expect(app.getByTestId("news-card")).toHaveCount(1);
  await expect(app.getByTestId("news-card").first()).toContainText("芯片");
  await page.screenshot({
    path: "test-results/mobile-following.png",
    fullPage: false,
  });
});

test("news card opens event relationship detail", async ({ page }) => {
  const app = await openMobilePreview(page);
  await app.getByTestId("open-event").first().tap();

  await expect(app.getByTestId("event-detail")).toBeVisible();
  await expect(app.getByTestId("event-detail")).toContainText("事件关联");
  await expect(app.getByTestId("event-detail")).toContainText("来源追溯");
  await expect(app.getByTestId("event-detail")).toContainText("演示事件");
  await page.screenshot({
    path: "test-results/mobile-detail.png",
    fullPage: false,
  });
});

test("event detail can scroll on a narrow mobile screen", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 640 });
  const app = await openMobilePreview(page);
  await app.getByTestId("open-event").first().tap();

  const scrollArea = app.getByTestId("event-detail-scroll");
  await expect(scrollArea).toBeVisible();
  const scrollMetrics = await scrollArea.evaluate((node) => ({
    overflowY: window.getComputedStyle(node).overflowY,
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }));

  expect(scrollMetrics.overflowY).toBe("auto");
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(
    scrollMetrics.clientHeight,
  );

  const scrolledTo = await scrollArea.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
    return node.scrollTop;
  });
  expect(scrolledTo).toBeGreaterThan(0);

  await page.screenshot({
    path: "test-results/mobile-detail-scroll.png",
    fullPage: false,
  });
});

test("narrow phone keeps every card inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const app = await openMobilePreview(page);
  const cards = app.getByTestId("news-card");

  const layoutMetrics = await app.locator("body").evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layoutMetrics.scrollWidth).toBeLessThanOrEqual(
    layoutMetrics.clientWidth + 1,
  );

  const overflowingCards = await cards.evaluateAll(
    (nodes) =>
      nodes.filter((node) => node.scrollWidth > node.clientWidth + 1).length,
  );
  expect(overflowingCards).toBe(0);

  await page.screenshot({
    path: "test-results/mobile-narrow-320.png",
    fullPage: false,
  });
});

test("desktop renders the app inside a phone-sized black canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .frameLocator('[data-testid="mobile-preview"]')
    .getByTestId("news-card")
    .first()
    .waitFor();

  const frameBox = await page.getByTestId("mobile-frame").boundingBox();
  expect(frameBox).not.toBeNull();
  if (frameBox) {
    expect(frameBox.width).toBeCloseTo(393, 0);
    expect(frameBox.height).toBeCloseTo(852, 0);
  }

  const canvasBackground = await page
    .locator(".device-canvas")
    .evaluate((node) => window.getComputedStyle(node).backgroundColor);
  expect(canvasBackground).toBe("rgb(0, 0, 0)");

  const bodyMetrics = await page.locator("body").evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(bodyMetrics.scrollWidth).toBeLessThanOrEqual(
    bodyMetrics.clientWidth + 1,
  );

  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: false,
  });
});

test("real backend news replaces demo data and exposes the original link", async ({
  page,
}) => {
  await page.route("**/api/backend/news?limit=24", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "news_live_test",
            title: "真实采集接口测试新闻",
            summary: "来自自动化测试的真实接口响应。",
            content: null,
            original_url: "https://example.com/live-news",
            source_id: "example_source",
            source_name: "示例媒体",
            publisher: "示例媒体",
            language: "zh",
            country_or_region: "中国",
            published_at: "2026-11-07T12:00:00Z",
            collected_at: "2026-11-07T12:01:00Z",
            category: "politics",
            image_url: null,
            collection_method: "rss",
            content_license_status: "publisher_owned_metadata_only",
          },
        ],
        next_cursor: null,
      }),
    });
  });

  const app = await openMobilePreview(page);
  await expect(app.getByTestId("news-card")).toHaveCount(1);
  await expect(app.getByTestId("news-card")).toContainText(
    "真实采集接口测试新闻",
  );
  await expect(app.getByTestId("news-card")).toContainText("API");

  await app.getByTestId("open-event").tap();
  await expect(
    app.getByTestId("event-detail").getByRole("link", { name: /原文/ }),
  ).toHaveAttribute("href", "https://example.com/live-news");
});

test("source admin preview renders source status from the proxy API", async ({
  page,
}) => {
  const source = {
    id: "example_source",
    name: "示例信源",
    publisher: "示例媒体",
    source_type: "rss",
    homepage_url: "https://example.com",
    language: "en",
    country_or_region: "Global",
    default_category: "politics",
    collection_method: "rss",
    enabled: true,
    paused: false,
    feeds: [
      {
        url: "https://example.com/rss.xml",
        format: "rss",
        category: "politics",
      },
    ],
    terms_status: "rss_metadata_only_pending_review",
    last_validation_status: "valid",
    last_checked_at: "2026-11-07T12:00:00Z",
    latest_item_published_at: "2026-11-07T11:00:00Z",
    last_collected_at: "2026-11-07T12:01:00Z",
    last_error: null,
  };
  await page.route(/\/api\/backend\/sources$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [source], total: 1 }),
    });
  });
  await page.route(/\/api\/backend\/sources\/status$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "example_source",
            validation_status: "valid",
            last_checked_at: "2026-11-07T12:00:00Z",
            last_collected_at: "2026-11-07T12:01:00Z",
            last_error: null,
          },
        ],
      }),
    });
  });

  await page.goto("/sources");
  const admin = page.frameLocator('[data-testid="source-admin-preview"]');
  await expect(admin.getByTestId("source-row")).toHaveCount(1);
  await expect(admin.getByTestId("source-row")).toContainText("示例信源");
  await expect(admin.getByTestId("source-row")).toContainText("可用");
});
