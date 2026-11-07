"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import {
  ArrowLeft,
  Database,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  Radio,
} from "lucide-react";

import { apiUrl } from "@/lib/api-base";
import { cn } from "@/lib/cn";

interface SourceFeed {
  url: string;
  format: string;
  category?: string | null;
}

interface SourceRecord {
  id: string;
  name: string;
  publisher: string;
  source_type: string;
  language: string;
  country_or_region: string;
  collection_method: string;
  enabled: boolean;
  paused: boolean;
  feeds: SourceFeed[];
  terms_status: string;
  last_validation_status: string;
  last_checked_at?: string | null;
  latest_item_published_at?: string | null;
  last_collected_at?: string | null;
  last_error?: string | null;
}

interface SourceListPayload {
  items: SourceRecord[];
  total: number;
}

interface SourceStatusPayload {
  items: Array<{
    id: string;
    validation_status: string;
    last_checked_at?: string | null;
    last_collected_at?: string | null;
    last_error?: string | null;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  valid: "可用",
  stale: "内容过期",
  invalid: "格式异常",
  restricted: "访问受限",
  available_webpage: "网页待审核",
  unknown: "未检测",
};

export function SourceAdmin() {
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [statusById, setStatusById] = useState<
    Record<string, SourceStatusPayload["items"][number]>
  >({});
  const [loading, setLoading] = useState(true);
  const [busySourceId, setBusySourceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchSourceData();
      setSources(payload.sources.items);
      setStatusById(payload.statusById);
    } catch {
      setError("无法连接后端。请确认 FastAPI 已在 8000 端口运行。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetchSourceData().then(
      (payload) => {
        if (!active) {
          return;
        }
        setSources(payload.sources.items);
        setStatusById(payload.statusById);
        setLoading(false);
      },
      () => {
        if (active) {
          setError("无法连接后端。请确认 FastAPI 已在 8000 端口运行。");
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  const enabledCount = useMemo(
    () => sources.filter((source) => source.enabled && !source.paused).length,
    [sources],
  );
  const collectableCount = useMemo(
    () => sources.filter((source) => source.feeds.length > 0).length,
    [sources],
  );

  async function runAction(
    sourceId: string,
    action: "collect" | "pause" | "resume",
  ) {
    setBusySourceId(sourceId);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/sources/${sourceId}/${action}`), {
        method: "POST",
      });
      if (!response.ok) {
        const payload = (await response.json()) as {
          error?: { message?: string };
        };
        throw new Error(payload.error?.message || "操作失败");
      }
      await loadSources();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败");
    } finally {
      setBusySourceId(null);
    }
  }

  return (
    <main className="min-h-full px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-10">
      <header className="liquid-panel flex items-center gap-3 rounded-[22px] px-3 py-3">
        <Link
          aria-label="返回新闻首页"
          className="grid size-9 place-items-center rounded-[13px] border border-white/10 bg-white/[0.05] text-white/58"
          href="/app"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-white/90">信源管理</h1>
          <p className="mt-0.5 text-[9px] tracking-[0.12em] text-white/32 uppercase">
            Source operations
          </p>
        </div>
        <button
          type="button"
          aria-label="刷新信源状态"
          className="grid size-9 place-items-center rounded-[13px] border border-white/10 bg-white/[0.05] text-white/58 disabled:opacity-40"
          disabled={loading}
          onClick={() => void loadSources()}
          title="刷新"
        >
          <RefreshCw
            aria-hidden="true"
            className={cn("size-4", loading && "animate-spin")}
          />
        </button>
      </header>

      <section className="mt-3 grid grid-cols-3 gap-2">
        <Summary label="全部来源" value={sources.length} />
        <Summary label="当前启用" value={enabledCount} />
        <Summary label="RSS 来源" value={collectableCount} />
      </section>

      {error && (
        <p className="mt-3 rounded-[16px] border border-red-200/15 bg-red-200/[0.06] px-3 py-2.5 text-[11px] leading-5 text-red-100/75">
          {error}
        </p>
      )}

      <div className="mt-3 space-y-2.5">
        {loading && sources.length === 0 ? (
          <div className="liquid-panel grid min-h-48 place-items-center rounded-[22px]">
            <LoaderCircle className="size-5 animate-spin text-white/40" />
          </div>
        ) : (
          sources.map((source) => {
            const status = statusById[source.id];
            const busy = busySourceId === source.id;
            const canCollect = source.feeds.length > 0 && source.enabled;

            return (
              <article
                key={source.id}
                className="liquid-panel rounded-[20px] p-3.5"
                data-testid="source-row"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[12px] border border-sky-200/12 bg-sky-200/[0.06] text-sky-100/70">
                    {source.source_type === "rss" ? (
                      <Radio aria-hidden="true" className="size-4" />
                    ) : (
                      <Database aria-hidden="true" className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[13px] font-medium text-white/82">
                        {source.name}
                      </h2>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-1.5 py-0.5 text-[8px]",
                          statusColor(
                            status?.validation_status ||
                              source.last_validation_status,
                          ),
                        )}
                      >
                        {STATUS_LABELS[
                          status?.validation_status ||
                            source.last_validation_status
                        ] || "未知"}
                      </span>
                    </div>
                    <p className="mt-1 text-[9px] text-white/32">
                      {source.publisher} · {source.source_type.toUpperCase()} ·{" "}
                      {source.language}
                    </p>
                    <p className="mt-1 text-[9px] text-white/26">
                      最近采集：
                      {formatDateTime(
                        status?.last_collected_at || source.last_collected_at,
                      )}
                    </p>
                  </div>
                </div>

                {(status?.last_error || source.last_error) && (
                  <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-amber-100/45">
                    {status?.last_error || source.last_error}
                  </p>
                )}

                <div className="mt-3 flex gap-2 border-t border-white/7 pt-2.5">
                  <button
                    type="button"
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[11px] border border-sky-200/12 bg-sky-200/[0.06] text-[10px] text-sky-100/65 disabled:opacity-30"
                    disabled={!canCollect || source.paused || busy}
                    onClick={() => void runAction(source.id, "collect")}
                  >
                    <Play aria-hidden="true" className="size-3" />
                    {busy ? "处理中" : "手动采集"}
                  </button>
                  <button
                    type="button"
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[11px] border border-white/8 bg-white/[0.035] text-[10px] text-white/48 disabled:opacity-30"
                    disabled={source.feeds.length === 0 || busy}
                    onClick={() =>
                      void runAction(
                        source.id,
                        source.paused ? "resume" : "pause",
                      )
                    }
                  >
                    {source.paused ? (
                      <Play aria-hidden="true" className="size-3" />
                    ) : (
                      <Pause aria-hidden="true" className="size-3" />
                    )}
                    {source.paused ? "恢复" : "暂停"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}

async function fetchSourceData(): Promise<{
  sources: SourceListPayload;
  statusById: Record<string, SourceStatusPayload["items"][number]>;
}> {
  const [sourceResponse, statusResponse] = await Promise.all([
    fetch(apiUrl("/sources"), { cache: "no-store" }),
    fetch(apiUrl("/sources/status"), { cache: "no-store" }),
  ]);
  if (!sourceResponse.ok || !statusResponse.ok) {
    throw new Error("信源接口暂时不可用");
  }

  const sources = (await sourceResponse.json()) as SourceListPayload;
  const status = (await statusResponse.json()) as SourceStatusPayload;
  return {
    sources,
    statusById: Object.fromEntries(status.items.map((item) => [item.id, item])),
  };
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="liquid-panel rounded-[16px] px-2 py-3 text-center">
      <p className="text-lg font-semibold text-white/84 tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[8px] text-white/30">{label}</p>
    </div>
  );
}

function statusColor(status: string): string {
  if (status === "valid") {
    return "border-emerald-200/14 bg-emerald-200/8 text-emerald-100/70";
  }
  if (status === "available_webpage") {
    return "border-sky-200/14 bg-sky-200/8 text-sky-100/65";
  }
  if (status === "stale") {
    return "border-amber-200/14 bg-amber-200/8 text-amber-100/65";
  }
  if (status === "restricted" || status === "invalid") {
    return "border-red-200/14 bg-red-200/8 text-red-100/65";
  }
  return "border-white/9 bg-white/[0.04] text-white/35";
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "尚未采集";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}
