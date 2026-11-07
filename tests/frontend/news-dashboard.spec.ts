import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("zhilan-followed-events-v1");
  });
  await page.goto("/");
  await expect(page.getByTestId("demo-notice")).toContainText("演示数据");
});

test("mobile first screen shows a dense demonstration feed", async ({
  page,
}) => {
  const cards = page.getByTestId("news-card");
  await expect(cards).toHaveCount(6);
  await expect(cards.first()).toContainText("演示");

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

  const layoutMetrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  const tabBox = await page.getByTestId("feed-tabs").boundingBox();

  expect(layoutMetrics.documentWidth).toBeLessThanOrEqual(
    layoutMetrics.viewportWidth + 1,
  );
  expect(tabBox).not.toBeNull();
  if (tabBox) {
    expect(
      Math.abs(tabBox.x + tabBox.width / 2 - layoutMetrics.clientWidth / 2),
    ).toBeLessThan(2);
  }
  await expect(page.getByText("情报概览")).toBeHidden();

  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: false,
  });
});

test("recommended categories expand and filter the feed", async ({ page }) => {
  await page.getByTestId("tab-recommended").click();

  await expect(page.getByTestId("category-panel")).toContainText("全部类型");
  await expect(
    page.getByTestId(/^category-(全部|国际|科技|经济|社会|环境|防务)$/),
  ).toHaveCount(7);
  await expect(page.getByTestId("category-全部")).toBeVisible();
  await expect(page.getByTestId("category-国际")).toBeVisible();
  await expect(page.getByTestId("category-科技")).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-categories.png",
    fullPage: false,
  });

  await page.getByTestId("category-科技").click();

  await expect(page.getByTestId("news-card")).toHaveCount(1);
  await expect(page.getByTestId("news-card").first()).toContainText("芯片");
});

test("following tab shows the demonstration watchlist and bookmark state", async ({
  page,
}) => {
  await page.getByTestId("tab-following").click();

  await expect(page.getByTestId("news-card")).toHaveCount(2);
  await expect(page.getByTestId("news-card").first()).toContainText(
    "多边能源会议",
  );

  await page.getByTestId("follow-demo-event-energy").click();

  await expect(page.getByTestId("news-card")).toHaveCount(1);
  await expect(page.getByTestId("news-card").first()).toContainText("芯片");
  await page.screenshot({
    path: "test-results/mobile-following.png",
    fullPage: false,
  });
});

test("search opens a result and event relationship detail", async ({
  page,
}) => {
  await page.getByTestId("open-search").click();
  await expect(page.getByTestId("search-sheet")).toBeVisible();

  await page.getByTestId("search-sheet").getByRole("searchbox").fill("芯片");

  await expect(page.getByTestId("search-result")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/mobile-search.png",
    fullPage: false,
  });
  await page.getByTestId("search-result").first().click();

  await expect(page.getByTestId("event-detail")).toBeVisible();
  await expect(page.getByTestId("event-detail")).toContainText("事件关联");
  await expect(page.getByTestId("event-detail")).toContainText("来源追溯");
  await expect(page.getByTestId("event-detail")).toContainText("演示事件");
  await page.screenshot({
    path: "test-results/mobile-detail.png",
    fullPage: false,
  });
});

test("desktop layout exposes the intelligence rail without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();

  await expect(page.getByText("情报概览")).toBeVisible();

  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: false,
  });
});
