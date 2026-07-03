"use client";

import type { ResearchItem } from "@/lib/types";
import { usePhase } from "./structure-provider";
import { KIND_LABEL, formatBytes } from "@/lib/ui";
import { t } from "@/lib/i18n";
import { HeartIcon, TrashIcon } from "./icons";
import { ItemThumb } from "./item-thumb";
import { Highlight } from "./highlight";

export function ItemCard({
  item,
  onOpen,
  onToggleFav,
  onDelete,
  isFav = false,
  showPhase = false,
  snippet,
  query,
}: {
  item: ResearchItem;
  onOpen: (item: ResearchItem) => void;
  onToggleFav: (item: ResearchItem) => void;
  onDelete: (item: ResearchItem) => void;
  isFav?: boolean;
  showPhase?: boolean;
  snippet?: string;
  query?: string;
}) {
  const phase = usePhase(item.phase);
  const deletable = true; // 私人工具：所有材料均可删除（种子会被提升后软删）

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(item)}
      className="group animate-fade-in flex cursor-pointer flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)]"
    >
      {/* Preview */}
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
        <ItemThumb item={item} variant="card" />

        <span
          className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm"
          style={{ backgroundColor: phase?.accent ?? "#555" }}
        >
          {KIND_LABEL[item.kind]}
        </span>

        {/* Actions: favorite (always) + delete (hover, uploads only) */}
        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          {deletable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              title={t.card_delete}
              className="rounded-full bg-black/45 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-accent group-hover:opacity-100"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFav(item);
            }}
            title={isFav ? t.unfav : t.fav}
            className={`rounded-full p-1.5 backdrop-blur-sm transition-all ${
              isFav
                ? "bg-black/45 text-rose-400"
                : "bg-black/45 text-white opacity-0 hover:text-rose-300 group-hover:opacity-100"
            }`}
          >
            <HeartIcon className="h-4 w-4" filled={isFav} />
          </button>
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="font-serif text-[15px] leading-snug text-ink line-clamp-2">
          <Highlight text={item.title} q={query} />
        </h3>
        {snippet ? (
          <p className="text-[12px] leading-relaxed text-muted line-clamp-2">
            <Highlight text={snippet} q={query} />
          </p>
        ) : item.description ? (
          <p className="text-[12.5px] leading-relaxed text-muted line-clamp-2">
            {item.description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1.5 text-[11px] text-muted">
          {showPhase && (
            <span
              className="rounded px-1.5 py-0.5"
              style={{
                color: phase?.accent,
                backgroundColor: `${phase?.accent ?? "#777"}14`,
              }}
            >
              {phase?.title}
            </span>
          )}
          {item.year && (
            <span className="rounded bg-paper-2 px-1.5 py-0.5 tabular-nums">{item.year}</span>
          )}
          {item.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded bg-paper-2 px-1.5 py-0.5">
              #{tag}
            </span>
          ))}
          {item.size ? (
            <span className="ml-auto tabular-nums">{formatBytes(item.size)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
