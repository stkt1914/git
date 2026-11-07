import type { CSSProperties } from "react";

import {
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Clock3,
  Network,
} from "lucide-react";

import { getCategoryVisual } from "@/data/category-config";
import { cn } from "@/lib/cn";
import { formatEventTime, formatLanguageList } from "@/lib/format";
import type { NewsEvent } from "@/types/news";

import { EventVisual } from "./event-visual";
import { SourceStack } from "./source-stack";

interface NewsCardProps {
  event: NewsEvent;
  index: number;
  followed: boolean;
  onOpen: (eventId: string) => void;
  onToggleFollow: (eventId: string) => void;
}

export function NewsCard({
  event,
  index,
  followed,
  onOpen,
  onToggleFollow,
}: NewsCardProps) {
  const visual = getCategoryVisual(event.category);

  return (
    <article
      className="news-card liquid-panel animate-card-in relative overflow-hidden rounded-[24px]"
      data-testid="news-card"
      style={
        {
          "--card-accent": visual.accent,
          "--card-soft": visual.soft,
          "--delay": `${index * 55}ms`,
        } as CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-5 left-0 w-[3px] rounded-r-full"
        style={{ backgroundColor: visual.accent, opacity: 0.8 }}
      />

      <div className="flex gap-2 p-3.5 pl-4">
        <button
          type="button"
          aria-label={`查看事件：${event.title}`}
          className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200"
          data-testid="open-event"
          onClick={() => onOpen(event.id)}
        >
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="rounded-full border px-2 py-0.5 text-[9px] font-semibold"
              style={{
                backgroundColor: visual.soft,
                borderColor: `${visual.accent}33`,
                color: visual.accent,
              }}
            >
              {event.category}
            </span>
            <span className="rounded-full border border-amber-200/16 bg-amber-200/8 px-2 py-0.5 text-[9px] font-medium text-amber-100/70">
              {event.isDemo ? "演示" : "API"}
            </span>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-white/42">
              <Clock3 aria-hidden="true" className="size-3" />
              {event.isDemo ? "演示 " : ""}
              {formatEventTime(event.publishedAt)}
            </span>
          </div>

          <h2 className="text-[16px] leading-[1.45] font-semibold text-white/94">
            {event.title}
          </h2>
          <p className="mt-1.5 text-[10.5px] leading-[1.65] text-white/48">
            {event.summary}
          </p>

          <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <SourceStack
              sources={event.sources}
              sourceCount={event.sourceCount}
            />
            <span className="size-0.5 shrink-0 rounded-full bg-white/24" />
            <span className="text-[10px] leading-4 text-white/38">
              {formatLanguageList(event.languages)} · {event.reportCount} 条报道
            </span>
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            type="button"
            aria-label={
              followed ? `取消关注：${event.title}` : `关注事件：${event.title}`
            }
            aria-pressed={followed}
            className={cn(
              "grid size-8 place-items-center rounded-[12px] border transition",
              followed
                ? "border-emerald-200/24 bg-emerald-200/14 text-emerald-100"
                : "border-white/9 bg-white/[0.04] text-white/42 hover:bg-white/10 hover:text-white/76",
            )}
            data-testid={`follow-${event.id}`}
            onClick={() => onToggleFollow(event.id)}
            title={followed ? "取消关注" : "关注事件"}
          >
            {followed ? (
              <BookmarkCheck aria-hidden="true" className="size-4" />
            ) : (
              <Bookmark aria-hidden="true" className="size-4" />
            )}
          </button>
          <EventVisual category={event.category} />
        </div>
      </div>

      <button
        type="button"
        className="flex w-full items-start gap-2 border-t border-white/8 px-4 py-2 text-left text-[10px] leading-4 text-white/44 transition hover:bg-white/[0.035] hover:text-white/66"
        onClick={() => onOpen(event.id)}
        tabIndex={-1}
      >
        <Network aria-hidden="true" className="size-3.5 text-white/34" />
        <span className="min-w-0 flex-1">{event.relationLabel}</span>
        <span className="shrink-0 text-white/28">事件关联</span>
        <ChevronRight aria-hidden="true" className="size-3.5" />
      </button>
    </article>
  );
}
