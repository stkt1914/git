import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";
import type { FeedTab } from "@/types/news";

interface TopBarProps {
  activeTab: FeedTab;
  categoryOpen: boolean;
  onTabChange: (tab: FeedTab) => void;
}

export function TopBar({ activeTab, categoryOpen, onTabChange }: TopBarProps) {
  return (
    <header className="flex justify-center">
      <div
        className="liquid-panel flex shrink-0 items-center rounded-full p-1"
        data-testid="feed-tabs"
      >
        <button
          type="button"
          aria-expanded={categoryOpen}
          className={cn(
            "flex h-8 items-center gap-1 rounded-full px-4 text-[13px] font-medium transition",
            activeTab === "recommended"
              ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
              : "text-white/58 hover:text-white",
          )}
          data-testid="tab-recommended"
          onClick={() => onTabChange("recommended")}
        >
          推荐
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 transition-transform duration-300",
              activeTab === "recommended" && categoryOpen && "rotate-180",
            )}
            strokeWidth={2}
          />
        </button>
        <button
          type="button"
          className={cn(
            "h-8 rounded-full px-4 text-[13px] font-medium transition",
            activeTab === "following"
              ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
              : "text-white/58 hover:text-white",
          )}
          data-testid="tab-following"
          onClick={() => onTabChange("following")}
        >
          关注
        </button>
      </div>
    </header>
  );
}
