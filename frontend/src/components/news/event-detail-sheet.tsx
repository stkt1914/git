"use client";

import { ChevronRight, Languages, Network, Radio, X } from "lucide-react";

import { getCategoryVisual } from "@/data/category-config";
import { useDialogDismiss } from "@/hooks/use-dialog-dismiss";
import { formatEventTime, formatLanguageList } from "@/lib/format";
import type { NewsEvent } from "@/types/news";

import { SourceStack } from "./source-stack";

interface EventDetailSheetProps {
  event: NewsEvent;
  events: NewsEvent[];
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
}

export function EventDetailSheet({
  event,
  events,
  onClose,
  onSelectEvent,
}: EventDetailSheetProps) {
  const visual = getCategoryVisual(event.category);
  const relatedEvents = event.relatedEventIds
    .map((id) => events.find((item) => item.id === id))
    .filter((item): item is NewsEvent => Boolean(item));

  useDialogDismiss(true, onClose);

  return (
    <div
      aria-label={`事件详情：${event.title}`}
      aria-modal="true"
      className="animate-overlay-in fixed inset-0 z-50 bg-[#020a08]/58 backdrop-blur-md"
      data-testid="event-detail"
      role="dialog"
    >
      <button
        type="button"
        aria-label="关闭事件详情"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      <article className="liquid-panel animate-sheet-in absolute inset-x-2 top-[max(4rem,calc(env(safe-area-inset-top)+0.75rem))] bottom-2 overflow-y-auto overscroll-contain rounded-[28px] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.5)] sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-4 sm:w-[480px] sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
              style={{
                backgroundColor: visual.soft,
                borderColor: `${visual.accent}32`,
                color: visual.accent,
              }}
            >
              <visual.icon className="size-3" strokeWidth={1.8} />
              {event.category}
            </span>
            <span className="rounded-full border border-amber-200/16 bg-amber-200/8 px-2.5 py-1 text-[10px] text-amber-100/70">
              {event.isDemo ? "演示事件" : "后端事件"}
            </span>
          </div>
          <button
            type="button"
            aria-label="关闭事件详情"
            className="grid size-9 place-items-center rounded-[13px] border border-white/8 bg-white/[0.04] text-white/48 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            title="关闭"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <h2 className="text-[25px] leading-[1.36] font-semibold text-white/94">
          {event.title}
        </h2>
        <p className="mt-3 text-[13px] leading-6 text-white/48">
          {event.summary}
        </p>

        <div className="mt-5 grid grid-cols-3 divide-x divide-white/8 rounded-[18px] border border-white/8 bg-black/12 py-3">
          <DetailMetric value={event.sourceCount} label="来源" />
          <DetailMetric value={event.reportCount} label="报道" />
          <DetailMetric value={event.languages.length} label="语言" />
        </div>

        <div className="mt-6 flex items-center gap-2 border-b border-white/8 pb-3">
          <Network aria-hidden="true" className="size-4 text-emerald-200/70" />
          <h3 className="text-sm font-semibold text-white/78">事件关联</h3>
          <span className="ml-auto text-[10px] text-white/28">
            {formatEventTime(event.updatedAt)} 更新
          </span>
        </div>

        {event.relationSteps.length > 0 ? (
          <ol className="mt-4 space-y-0">
            {event.relationSteps.map((step, index) => (
              <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                {index < event.relationSteps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-3 bottom-0 left-[5px] w-px bg-white/10"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="relative mt-1 size-[11px] shrink-0 rounded-full border-2 border-[#0a1714]"
                  style={{ backgroundColor: visual.accent }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 tabular-nums">
                      {step.at}
                    </span>
                    <p className="text-xs font-medium text-white/68">
                      {step.title}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-white/36">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-[16px] border border-white/7 bg-white/[0.03] px-3 py-3 text-[11px] leading-5 text-white/36">
            后端事件列表接口尚未返回关联轨迹。
          </p>
        )}

        <div className="mt-6 flex items-center gap-2 border-b border-white/8 pb-3">
          <Radio aria-hidden="true" className="size-4 text-sky-200/70" />
          <h3 className="text-sm font-semibold text-white/78">来源追溯</h3>
          <span className="ml-auto text-[10px] text-white/28">
            {event.sourceCount} 家来源
          </span>
        </div>

        {event.sources.length > 0 ? (
          <div className="mt-3 space-y-2">
            {event.sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-3 rounded-[16px] border border-white/7 bg-white/[0.025] px-3 py-2.5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-[11px] border border-white/10 bg-white/[0.055] text-[11px] font-semibold text-white/70">
                  {source.shortName}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white/68">
                    {source.name}
                  </p>
                  <p className="mt-0.5 text-[9px] text-white/28">
                    {source.region} · {source.language}
                  </p>
                </div>
                <span className="rounded-full border border-amber-200/12 bg-amber-200/6 px-2 py-0.5 text-[8px] text-amber-100/50">
                  演示
                </span>
              </div>
            ))}
            <p className="px-1 pt-1 text-[9px] leading-4 text-white/24">
              演示数据不包含可访问的原始报道链接，接入真实数据后将在此显示来源证据链。
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[11px] leading-5 text-white/36">
            当前事件接口未返回来源明细。
          </p>
        )}

        <div className="mt-6 flex items-center gap-2 border-b border-white/8 pb-3">
          <Languages aria-hidden="true" className="size-4 text-amber-200/70" />
          <h3 className="text-sm font-semibold text-white/78">关联事件</h3>
          <span className="ml-auto text-[10px] text-white/28">
            {formatLanguageList(event.languages)}
          </span>
        </div>

        {relatedEvents.length > 0 ? (
          <div className="mt-3 space-y-2">
            {relatedEvents.map((relatedEvent) => (
              <button
                key={relatedEvent.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-[16px] border border-white/7 bg-white/[0.025] px-3 py-3 text-left transition hover:bg-white/[0.055]"
                onClick={() => onSelectEvent(relatedEvent.id)}
              >
                <SourceStack
                  sources={relatedEvent.sources}
                  sourceCount={relatedEvent.sourceCount}
                />
                <span className="min-w-0 flex-1 truncate text-[11px] text-white/56">
                  {relatedEvent.title}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-white/24"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[11px] leading-5 text-white/36">
            当前事件暂无关联事件。
          </p>
        )}
      </article>
    </div>
  );
}

function DetailMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-2 text-center">
      <p className="text-lg font-semibold text-white/88 tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[9px] tracking-[0.08em] text-white/28">
        {label}
      </p>
    </div>
  );
}
