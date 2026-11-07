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
