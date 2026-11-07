"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { ChevronRight, Search, X } from "lucide-react";

import { getCategoryVisual } from "@/data/category-config";
import { useDialogDismiss } from "@/hooks/use-dialog-dismiss";
import { formatEventTime } from "@/lib/format";
import type { NewsEvent } from "@/types/news";

interface SearchSheetProps {
  events: NewsEvent[];
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
}

const SUGGESTED_KEYWORDS = ["能源", "芯片", "供应链", "海上"];

export function SearchSheet({
  events,
  onClose,
  onSelectEvent,
}: SearchSheetProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  useDialogDismiss(true, onClose);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const filteredEvents = useMemo(() => {
    const keyword = deferredQuery.trim().toLocaleLowerCase("zh-CN");
    if (!keyword) {
      return events;
    }

    return events.filter((event) =>
      [
        event.title,
        event.summary,
        event.category,
        ...event.tags,
        ...event.sources.map((source) => source.name),
      ]
        .join(" ")
        .toLocaleLowerCase("zh-CN")
        .includes(keyword),
    );
  }, [deferredQuery, events]);

  function handleSelect(eventId: string) {
    onSelectEvent(eventId);
  }

  return (
    <div
      aria-label="搜索演示新闻"
      aria-modal="true"
      className="animate-overlay-in fixed inset-0 z-50 bg-[#020a08]/62 p-3 pt-[max(4.5rem,calc(env(safe-area-inset-top)+1rem))] backdrop-blur-md sm:p-6 sm:pt-20"
      data-testid="search-sheet"
      role="dialog"
    >
      <button
        type="button"
        aria-label="关闭搜索"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      <div className="liquid-panel animate-sheet-in relative mx-auto flex max-h-[min(72vh,620px)] w-full max-w-2xl flex-col rounded-[28px] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2.5 rounded-[18px] border border-white/10 bg-black/20 px-3">
          <Search
            aria-hidden="true"
            className="size-[18px] shrink-0 text-white/38"
          />
          <input
            ref={inputRef}
            type="search"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/28"
            placeholder="搜索事件、来源或主题"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            aria-label="关闭搜索"
            className="grid size-8 shrink-0 place-items-center rounded-[11px] text-white/42 transition hover:bg-white/8 hover:text-white"
            onClick={onClose}
            title="关闭"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex scrollbar-none items-center gap-2 overflow-x-auto px-1 py-3">
          <span className="shrink-0 text-[10px] text-white/28">建议</span>
          {SUGGESTED_KEYWORDS.map((keyword) => (
            <button
              key={keyword}
              type="button"
              className="shrink-0 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1.5 text-[10px] text-white/48 transition hover:bg-white/9 hover:text-white/76"
              onClick={() => setQuery(keyword)}
            >
              {keyword}
            </button>
          ))}
          <span className="ml-auto shrink-0 text-[10px] text-white/24 tabular-nums">
            {filteredEvents.length} 个演示事件
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {filteredEvents.length > 0 ? (
            <div className="space-y-1.5 pb-1">
              {filteredEvents.map((event) => {
                const visual = getCategoryVisual(event.category);

                return (
                  <button
                    key={event.id}
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-[17px] border border-transparent px-2.5 py-2.5 text-left transition hover:border-white/9 hover:bg-white/[0.055]"
                    data-testid="search-result"
                    onClick={() => handleSelect(event.id)}
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-[13px] border border-white/10"
                      style={{ backgroundColor: visual.soft }}
                    >
                      <visual.icon
                        className="size-4"
                        style={{ color: visual.accent }}
                        strokeWidth={1.6}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 flex items-center gap-1.5 text-[9px]">
                        <span style={{ color: visual.accent }}>
                          {event.category}
                        </span>
                        <span className="rounded-full border border-amber-200/14 bg-amber-200/7 px-1.5 py-0.5 text-amber-100/60">
                          {event.isDemo ? "演示" : "API"}
                        </span>
                        <span className="text-white/24">
                          {formatEventTime(event.publishedAt)}
                        </span>
                      </span>
                      <span className="line-clamp-1 text-[13px] font-medium text-white/78 group-hover:text-white">
                        {event.title}
                      </span>
                      <span className="mt-1 block truncate text-[9px] text-white/30">
                        {event.sources.length > 0
                          ? event.sources
                              .map((source) => source.name)
                              .join(" · ")
                          : `${event.sourceCount} 家来源`}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/44"
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center px-6 text-center">
              <div>
                <p className="text-sm font-medium text-white/64">
                  未找到匹配事件
                </p>
                <p className="mt-1 text-xs text-white/30">
                  尝试搜索“能源”“芯片”或“供应链”。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
