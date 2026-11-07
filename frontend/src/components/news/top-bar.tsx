import { ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/cn";
import type { FeedTab } from "@/types/news";

interface TopBarProps {
  activeTab: FeedTab;
  categoryOpen: boolean;
  onTabChange: (tab: FeedTab) => void;
  onSearchOpen: () => void;
}

export function TopBar({
  activeTab,
  categoryOpen,
  onTabChange,
  onSearchOpen,
}: TopBarProps) {
  return (
    <header className="liquid-panel grid h-[58px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center rounded-[22px] px-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="grid size-9 shrink-0 place-items-center rounded-[14px] border border-white/15 bg-white/10 text-sm font-semibold text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          智
        </div>
        <div className="hidden min-w-0 min-[390px]:block">
          <p className="truncate text-sm font-semibold text-white">智览时政</p>
          <p className="truncate text-[9px] font-medium tracking-[0.16em] text-white/42 uppercase">
            Intel Brief
          </p>
        </div>
      </div>

      <div
        className="flex shrink-0 items-center rounded-full border border-white/10 bg-black/20 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]"
        data-testid="feed-tabs"
      >
        <button
          type="button"
          aria-expanded={categoryOpen}
          className={cn(
            "flex h-8 items-center gap-1 rounded-full px-3.5 text-[13px] font-medium transition",
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
            "h-8 rounded-full px-3.5 text-[13px] font-medium transition",
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

      <div className="flex flex-1 justify-end">
        <button
          type="button"
          aria-label="搜索演示新闻"
          className="grid size-10 place-items-center rounded-[15px] border border-white/10 bg-white/[0.07] text-white/72 transition hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
          data-testid="open-search"
          onClick={onSearchOpen}
          title="搜索"
        >
          <Search
            aria-hidden="true"
            className="size-[19px]"
            strokeWidth={1.8}
          />
        </button>
      </div>
    </header>
  );
}
