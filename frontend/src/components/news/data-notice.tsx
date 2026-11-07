import { FlaskConical, Radio } from "lucide-react";

import { cn } from "@/lib/cn";
import type { FeedMode, FeedSyncState } from "@/types/news";

interface DataNoticeProps {
  mode: FeedMode;
  syncState: FeedSyncState;
  message: string;
}

export function DataNotice({ mode, syncState, message }: DataNoticeProps) {
  const isDemo = mode === "demo";

  return (
    <div
      className={cn(
        "liquid-panel flex items-center gap-2.5 rounded-[18px] px-3 py-2.5",
        isDemo ? "border-amber-200/18" : "border-emerald-200/18",
      )}
      data-testid="demo-notice"
      role="status"
    >
      <div
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-xl border",
          isDemo
            ? "border-amber-200/20 bg-amber-200/10 text-amber-100"
            : "border-emerald-200/20 bg-emerald-200/10 text-emerald-100",
        )}
      >
        {isDemo ? (
          <FlaskConical aria-hidden="true" className="size-4" />
        ) : (
          <Radio aria-hidden="true" className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white">
          {isDemo ? "演示数据 · 非实时新闻" : "后端数据 · 事件接口已连接"}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-white/48">
          {syncState === "checking" ? "正在尝试连接后端事件接口" : message}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-1 text-[9px] font-medium tracking-[0.08em]",
          isDemo
            ? "border-amber-200/16 bg-amber-200/8 text-amber-100/78"
            : "border-emerald-200/16 bg-emerald-200/8 text-emerald-100/78",
        )}
      >
        {syncState === "connected"
          ? "API"
          : syncState === "checking"
            ? "同步中"
            : "本地"}
      </span>
    </div>
  );
}
