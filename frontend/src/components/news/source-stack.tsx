import type { NewsSource } from "@/types/news";

interface SourceStackProps {
  sources: NewsSource[];
  sourceCount: number;
}

const AVATAR_COLORS = ["#205b55", "#70502c", "#3c5270", "#70434a", "#586533"];

export function SourceStack({ sources, sourceCount }: SourceStackProps) {
  const visibleSources = sources.slice(0, 3);
  const sourceNames =
    sources.length > 0
      ? sources.map((source) => source.name).join("、")
      : `${sourceCount} 家来源`;

  return (
    <div className="flex min-w-0 items-center gap-2" title={sourceNames}>
      <div className="flex -space-x-1.5">
        {visibleSources.map((source, index) => (
          <span
            key={source.id}
            className="grid size-5 place-items-center rounded-full border border-[#10211d] text-[9px] font-semibold text-white/90"
            style={{
              backgroundColor:
                AVATAR_COLORS[
                  source.shortName.charCodeAt(0) % AVATAR_COLORS.length
                ],
              zIndex: visibleSources.length - index,
            }}
            title={`${source.name} · ${source.region}`}
          >
            {source.shortName}
          </span>
        ))}
      </div>
      <span className="truncate text-[11px] font-medium text-white/58">
        {sources.length > 0
          ? `${sources[0].name}${sources.length > 1 ? ` 等 ${sourceCount} 家` : ""}`
          : `${sourceCount} 家来源`}
      </span>
    </div>
  );
}
