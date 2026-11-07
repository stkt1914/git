import type { CSSProperties } from "react";

import { Network } from "lucide-react";

import { getCategoryVisual } from "@/data/category-config";
import type { NewsCategory } from "@/types/news";

interface EventVisualProps {
  category: NewsCategory;
}

export function EventVisual({ category }: EventVisualProps) {
  const visual = getCategoryVisual(category);
  const Icon = visual.icon;

  return (
    <div
      aria-hidden="true"
      className="relative grid size-[58px] shrink-0 place-items-center overflow-hidden rounded-[18px] border border-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
      style={
        {
          "--event-glow": visual.glow,
          "--event-soft": visual.soft,
          background:
            "linear-gradient(145deg, var(--event-glow), rgba(5, 15, 13, 0.2) 58%, var(--event-soft))",
        } as CSSProperties
      }
    >
      <span className="absolute inset-x-1.5 top-1.5 h-px bg-white/20" />
      <Icon className="size-5 text-white/82" strokeWidth={1.5} />
      <span className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 text-[8px] font-medium text-white/72">
        <Network className="size-2.5" />
        事件
      </span>
    </div>
  );
}
