import { DEMO_EVENTS } from "@/data/demo-events";
import { apiUrl } from "@/lib/api-base";
import { formatEventTime } from "@/lib/format";
import type { FeedState, NewsCategory, NewsEvent } from "@/types/news";

const REQUEST_TIMEOUT_MS = 3500;

const API_CATEGORY_MAP: Record<string, NewsCategory> = {
  international: "国际",
  politics: "国际",
  world: "国际",
  technology: "科技",
  tech: "科技",
  economy: "经济",
  business: "经济",
  society: "社会",
  social: "社会",
  environment: "环境",
  climate: "环境",
  defense: "防务",
  security: "防务",
  国际: "国际",
  科技: "科技",
  经济: "经济",
  社会: "社会",
  环境: "环境",
  防务: "防务",
};

interface ApiNewsItem {
  id: string;
  title: string;
  summary?: string;
  content?: string | null;
  original_url: string;
  source_id: string;
  source_name: string;
  publisher: string;
  language: string;
  country_or_region: string;
  published_at: string;
  collected_at: string;
  category?: string;
  image_url?: string | null;
  collection_method: string;
}

export function createDemoFeedState(
  syncState: FeedState["syncState"] = "checking",
): FeedState {
  return {
    items: DEMO_EVENTS,
    mode: "demo",
    syncState,
    message:
      syncState === "checking"
        ? "正在尝试连接后端新闻接口"
        : "后端新闻接口尚未提供数据，当前展示本地演示数据",
  };
}

export async function requestNewsFeed(): Promise<FeedState> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(apiUrl("/news?limit=24"), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`News API returned ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!isApiListPayload(payload)) {
      throw new Error("News API response shape is invalid");
    }

    const items = payload.items
      .map(toNewsEvent)
      .filter((event): event is NewsEvent => event !== null);

    if (items.length === 0) {
      throw new Error("News API returned no items");
    }

    return {
      items,
      mode: "live",
      syncState: "connected",
      message: "新闻列表来自后端 API",
    };
  } catch {
    return createDemoFeedState("fallback");
  } finally {
    window.clearTimeout(timeout);
  }
}

function isApiListPayload(value: unknown): value is { items: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray(value.items)
  );
}

function toNewsEvent(value: unknown): NewsEvent | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const item = value as Partial<ApiNewsItem>;
  if (
    typeof item.id !== "string" ||
    typeof item.title !== "string" ||
    typeof item.published_at !== "string" ||
    typeof item.original_url !== "string" ||
    typeof item.source_id !== "string" ||
    typeof item.source_name !== "string"
  ) {
    return null;
  }

  const category = normalizeCategory(item.category);
  const language = item.language || "und";
  const collectionMethod = item.collection_method || "rss";

  return {
    id: item.id,
    title: item.title,
    summary: item.summary || "后端暂未提供新闻摘要。",
    category,
    publishedAt: item.published_at,
    updatedAt: item.published_at,
    sources: [
      {
        id: item.source_id,
        name: item.source_name,
        shortName: item.source_name.slice(0, 1),
        region: item.country_or_region || "未知地区",
        language,
        originalUrl: item.original_url,
      },
    ],
    sourceCount: 1,
    reportCount: 1,
    languages: [language],
    relationLabel: "单来源报道 · 待事件聚合",
    relationSteps: [
      {
        id: `${item.id}-origin`,
        at: formatEventTime(item.published_at),
        title: "原始报道入库",
        detail: `${item.source_name} 通过 ${collectionMethod.toUpperCase()} 提供。`,
        kind: "origin",
      },
    ],
    relatedEventIds: [],
    tags: [category],
    isDemo: false,
  };
}

function normalizeCategory(value: string | undefined): NewsCategory {
  if (!value) {
    return "社会";
  }

  return (
    API_CATEGORY_MAP[value.toLowerCase()] ?? API_CATEGORY_MAP[value] ?? "社会"
  );
}
