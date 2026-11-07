import { DEMO_EVENTS } from "@/data/demo-events";
import type { FeedState, NewsCategory, NewsEvent } from "@/types/news";

const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";
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

interface ApiEventListItem {
  id: string;
  title: string;
  summary?: string;
  category?: string;
  first_published_at: string;
  last_published_at?: string;
  report_count?: number;
  source_count?: number;
  languages?: string[];
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
        ? "正在尝试连接后端事件接口"
        : "后端事件接口尚未提供数据，当前展示本地演示数据",
  };
}

export async function requestNewsFeed(): Promise<FeedState> {
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
  ).replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${apiBaseUrl}/events?limit=24`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Event API returned ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!isApiListPayload(payload)) {
      throw new Error("Event API response shape is invalid");
    }

    const items = payload.items
      .map(toNewsEvent)
      .filter((event): event is NewsEvent => event !== null);

    if (items.length === 0) {
      throw new Error("Event API returned no events");
    }

    return {
      items,
      mode: "live",
      syncState: "connected",
      message: "事件列表来自后端 API",
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

  const item = value as Partial<ApiEventListItem>;
  if (
    typeof item.id !== "string" ||
    typeof item.title !== "string" ||
    typeof item.first_published_at !== "string"
  ) {
    return null;
  }

  const category = normalizeCategory(item.category);
  const languages = Array.isArray(item.languages)
    ? item.languages.filter(
        (language): language is string => typeof language === "string",
      )
    : [];
  const sourceCount =
    typeof item.source_count === "number" ? item.source_count : 0;
  const reportCount =
    typeof item.report_count === "number" ? item.report_count : 0;

  return {
    id: item.id,
    title: item.title,
    summary: item.summary || "后端暂未提供事件摘要。",
    category,
    publishedAt: item.first_published_at,
    updatedAt: item.last_published_at || item.first_published_at,
    sources: [],
    sourceCount,
    reportCount,
    languages,
    relationLabel: `${sourceCount} 家来源 · ${reportCount} 条报道`,
    relationSteps: [],
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
