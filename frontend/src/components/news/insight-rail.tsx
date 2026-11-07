import {
  FlaskConical,
  Languages,
  Network,
  Radio,
  type LucideIcon,
} from "lucide-react";

import { getCategoryVisual } from "@/data/category-config";
import { cn } from "@/lib/cn";
import type { FeedState, NewsCategory } from "@/types/news";

interface InsightRailProps {
  feed: FeedState;
}

export function InsightRail({ feed }: InsightRailProps) {
  const categoryCounts = feed.items.reduce<
    Partial<Record<NewsCategory, number>>
  >((counts, event) => {
    counts[event.category] = (counts[event.category] ?? 0) + 1;
    return counts;
  }, {});
  const categories = Object.entries(categoryCounts) as Array<
    [NewsCategory, number]
  >;
  const maximalCategoryCount = Math.max(
    ...categories.map(([, count]) => count),
  );
  const reportCount = feed.items.reduce(
    (total, event) => total + event.reportCount,
    0,
  );
  const multilingualCount = feed.items.filter(
    (event) => event.languages.length > 1,
  ).length;

  return (
    <aside className="hidden space-y-3 lg:sticky lg:top-24 lg:block">
      <section className="liquid-panel rounded-[24px] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] text-white/34 uppercase">
              Daily matrix
            </p>
            <h2 className="mt-1 text-base font-semibold text-white/88">
              情报概览
            </h2>
          </div>
          <span
            className={cn(
              "rounded-full border px-2 py-1 text-[9px]",
              feed.mode === "demo"
                ? "border-amber-200/16 bg-amber-200/8 text-amber-100/70"
                : "border-emerald-200/16 bg-emerald-200/8 text-emerald-100/70",
            )}
          >
            {feed.mode === "demo" ? "演示" : "API"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-white/8 border-y border-white/8 py-4">
          <Metric value={feed.items.length} label="事件" />
          <Metric value={reportCount} label="报道" />
          <Metric value={multilingualCount} label="跨语言" />
        </div>

        <div className="mt-5 space-y-3">
          {categories.map(([category, count]) => {
            const visual = getCategoryVisual(category);

            return (
              <div key={category}>
                <div className="mb-1.5 flex items-center justify-between text-[10px]">
                  <span className="text-white/56">{category}</span>
                  <span className="text-white/30 tabular-nums">{count}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/7">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: visual.accent,
                      width: `${Math.max(18, (count / maximalCategoryCount) * 100)}%`,
                      opacity: 0.78,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="liquid-panel rounded-[24px] p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/72">
          <Network aria-hidden="true" className="size-4 text-emerald-200/70" />
          事件关联
        </div>
        <div className="mt-4 space-y-3">
          <RelationRow
            icon={Languages}
            label="多语言事件"
            value={`${multilingualCount} 个`}
          />
          <RelationRow
            icon={Radio}
            label="来源状态"
            value={feed.syncState === "connected" ? "已同步" : "演示回退"}
          />
          <RelationRow
            icon={FlaskConical}
            label="数据性质"
            value={feed.mode === "demo" ? "非实时" : "接口数据"}
          />
        </div>
        <p className="mt-4 border-t border-white/8 pt-3 text-[10px] leading-5 text-white/32">
          {feed.message}
        </p>
      </section>
    </aside>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-2 text-center first:pl-0 last:pr-0">
      <p className="text-xl font-semibold text-white/90 tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[9px] tracking-[0.08em] text-white/32">{label}</p>
    </div>
  );
}

function RelationRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-7 place-items-center rounded-[10px] border border-white/8 bg-white/[0.04] text-white/42">
        <Icon aria-hidden="true" className="size-3.5" />
      </span>
      <span className="flex-1 text-[11px] text-white/48">{label}</span>
      <span className="text-[10px] font-medium text-white/68">{value}</span>
    </div>
  );
}
