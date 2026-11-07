"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Radio } from "lucide-react";

import { useFollowedEvents } from "@/hooks/use-followed-events";
import { createDemoFeedState, requestNewsFeed } from "@/lib/api";
import { formatEventDate } from "@/lib/format";
import type { FeedState, FeedTab, NewsCategoryFilter } from "@/types/news";

import { CategoryPanel } from "./category-panel";
import { DataNotice } from "./data-notice";
import { EventDetailSheet } from "./event-detail-sheet";
import { InsightRail } from "./insight-rail";
import { NewsFeed } from "./news-feed";
import { SearchSheet } from "./search-sheet";
import { TopBar } from "./top-bar";

export function NewsDashboard() {
  const [feed, setFeed] = useState<FeedState>(() => createDemoFeedState());
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");
  const [selectedCategory, setSelectedCategory] =
    useState<NewsCategoryFilter>("全部");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { followedIds, toggleFollow } = useFollowedEvents();

  useEffect(() => {
    let active = true;

    requestNewsFeed().then((nextFeed) => {
      if (active) {
        setFeed(nextFeed);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const visibleEvents = useMemo(() => {
    if (activeTab === "following") {
      return feed.items.filter((event) => followedIds.includes(event.id));
    }

    if (selectedCategory === "全部") {
      return feed.items;
    }

    return feed.items.filter((event) => event.category === selectedCategory);
  }, [activeTab, feed.items, followedIds, selectedCategory]);

  const selectedEvent =
    feed.items.find((event) => event.id === selectedEventId) ?? null;
  const dateLabel = feed.items[0]
    ? formatEventDate(feed.items[0].publishedAt)
    : "今日";

  const closeDetail = useCallback(() => setSelectedEventId(null), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  function handleTabChange(tab: FeedTab) {
    if (tab === "recommended") {
      setActiveTab("recommended");
      setCategoryOpen(activeTab === "recommended" ? !categoryOpen : true);
      return;
    }

    setActiveTab("following");
    setCategoryOpen(false);
  }

  function handleCategorySelect(category: NewsCategoryFilter) {
    setSelectedCategory(category);
    setCategoryOpen(false);
  }

  function handleSearchResult(eventId: string) {
    setSearchOpen(false);
    setSelectedEventId(eventId);
  }

  const heading = activeTab === "following" ? "我的关注" : "今日热点";
  const kicker =
    activeTab === "following"
      ? "WATCHLIST / 演示关注流"
      : `DAILY SIGNAL / ${selectedCategory === "全部" ? "全类型" : selectedCategory}`;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto w-full max-w-[1120px]">
          <TopBar
            activeTab={activeTab}
            categoryOpen={categoryOpen}
            onSearchOpen={() => setSearchOpen(true)}
            onTabChange={handleTabChange}
          />
          <CategoryPanel
            open={activeTab === "recommended" && categoryOpen}
            selected={selectedCategory}
            onSelect={handleCategorySelect}
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1120px] px-3 pt-3 pb-12 sm:px-5">
        <DataNotice
          message={feed.message}
          mode={feed.mode}
          syncState={feed.syncState}
        />

        <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,720px)_320px] lg:items-start">
          <section aria-labelledby="feed-heading">
            <div className="flex items-end justify-between px-1 pt-2 pb-3">
              <div>
                <p className="text-[9px] font-medium tracking-[0.18em] text-white/30 uppercase">
                  {kicker}
                </p>
                <h1
                  id="feed-heading"
                  className="mt-1 text-[26px] font-semibold tracking-normal text-white/94"
                >
                  {heading}
                </h1>
              </div>
              <div className="pb-0.5 text-right">
                <p className="text-[10px] text-white/40">
                  {feed.mode === "demo" ? "演示样本日" : "最新更新"} ·{" "}
                  {dateLabel}
                </p>
                <p className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-white/28">
                  <Radio aria-hidden="true" className="size-3" />
                  {visibleEvents.length} 个事件
                </p>
              </div>
            </div>

            <NewsFeed
              events={visibleEvents}
              followedIds={followedIds}
              onOpen={setSelectedEventId}
              onToggleFollow={toggleFollow}
              selectedCategory={selectedCategory}
              tab={activeTab}
            />
          </section>

          <InsightRail feed={feed} />
        </div>
      </main>

      {searchOpen && (
        <SearchSheet
          events={feed.items}
          onClose={closeSearch}
          onSelectEvent={handleSearchResult}
        />
      )}

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          events={feed.items}
          onClose={closeDetail}
          onSelectEvent={setSelectedEventId}
        />
      )}
    </div>
  );
}
