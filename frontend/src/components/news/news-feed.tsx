import { Bookmark, ScanSearch } from "lucide-react";

import { cn } from "@/lib/cn";
import type { FeedTab, NewsCategoryFilter, NewsEvent } from "@/types/news";

import { NewsCard } from "./news-card";

interface NewsFeedProps {
  events: NewsEvent[];
  tab: FeedTab;
  selectedCategory: NewsCategoryFilter;
  followedIds: string[];
  onOpen: (eventId: string) => void;
  onToggleFollow: (eventId: string) => void;
}

export function NewsFeed({
  events,
  tab,
  selectedCategory,
  followedIds,
  onOpen,
  onToggleFollow,
}: NewsFeedProps) {
  if (events.length === 0) {
    const isFollowing = tab === "following";
    const Icon = isFollowing ? Bookmark : ScanSearch;

    return (
      <div className="liquid-panel grid min-h-[220px] place-items-center rounded-[24px] p-8 text-center">
        <div>
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/40">
            <Icon aria-hidden="true" className="size-5" />
          </div>
          <p className="mt-4 text-sm font-medium text-white/76">
            {isFollowing ? "暂无关注事件" : "当前分类暂无事件"}
          </p>
          <p className="mt-1 text-xs leading-6 text-white/38">
            {isFollowing
              ? "在推荐流中点击书签图标，即可把事件加入关注。"
              : "可以切换分类，或者在搜索中查看全部演示事件。"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex flex-col gap-2.5",
        tab === "following" && selectedCategory !== "全部" && "opacity-100",
      )}
    >
      {events.map((event, index) => (
        <NewsCard
          key={event.id}
          event={event}
          followed={followedIds.includes(event.id)}
          index={index}
          onOpen={onOpen}
          onToggleFollow={onToggleFollow}
        />
      ))}
    </div>
  );
}
