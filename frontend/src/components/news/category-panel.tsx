import { Layers3 } from "lucide-react";

import { CATEGORY_FILTERS, CATEGORY_VISUALS } from "@/data/category-config";
import { cn } from "@/lib/cn";
import type { NewsCategoryFilter } from "@/types/news";

interface CategoryPanelProps {
  open: boolean;
  selected: NewsCategoryFilter;
  onSelect: (category: NewsCategoryFilter) => void;
}

export function CategoryPanel({
  open,
  selected,
  onSelect,
}: CategoryPanelProps) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
        open
          ? "grid-rows-[1fr] opacity-100"
          : "pointer-events-none grid-rows-[0fr] opacity-0",
      )}
      data-testid="category-panel"
    >
      <div className="min-h-0 overflow-hidden">
        <div className="liquid-panel mt-2 rounded-[22px] p-3.5">
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2 text-xs font-medium text-white/64">
              <Layers3 aria-hidden="true" className="size-3.5" />
              全部类型
            </div>
            <span className="text-[10px] tracking-[0.16em] text-white/32 uppercase">
              6 categories
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((category) => {
              const isAll = category === "全部";
              const visual = isAll ? null : CATEGORY_VISUALS[category];
              const active = selected === category;

              return (
                <button
                  key={category}
                  type="button"
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition",
                    active
                      ? "border-white/22 bg-white/14 text-white"
                      : "border-white/8 bg-white/[0.045] text-white/56 hover:bg-white/9 hover:text-white/82",
                  )}
                  data-testid={`category-${category}`}
                  onClick={() => onSelect(category)}
                  tabIndex={open ? 0 : -1}
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        visual?.accent ?? "rgba(255,255,255,0.72)",
                    }}
                  />
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
