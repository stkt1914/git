export const NEWS_CATEGORIES = [
  "全部",
  "国际",
  "科技",
  "经济",
  "社会",
  "环境",
  "防务",
] as const;

export type NewsCategoryFilter = (typeof NEWS_CATEGORIES)[number];
export type NewsCategory = Exclude<NewsCategoryFilter, "全部">;
export type FeedTab = "recommended" | "following";
export type FeedMode = "demo" | "live";
export type FeedSyncState = "checking" | "connected" | "fallback";

export interface NewsSource {
  id: string;
  name: string;
  shortName: string;
  region: string;
  language: string;
}

export type RelationStepKind =
  "origin" | "corroboration" | "cross-language" | "follow-up";

export interface RelationStep {
  id: string;
  at: string;
  title: string;
  detail: string;
  kind: RelationStepKind;
}

export interface NewsEvent {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory;
  publishedAt: string;
  updatedAt: string;
  sources: NewsSource[];
  sourceCount: number;
  reportCount: number;
  languages: string[];
  relationLabel: string;
  relationSteps: RelationStep[];
  relatedEventIds: string[];
  tags: string[];
  isDemo: boolean;
}

export interface FeedState {
  items: NewsEvent[];
  mode: FeedMode;
  syncState: FeedSyncState;
  message: string;
}
