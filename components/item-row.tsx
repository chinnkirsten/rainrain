"use client";

import type { ResearchItem } from "@/lib/types";
import { usePhase } from "./structure-provider";
import { KIND_LABEL, formatBytes } from "@/lib/ui";
import { t } from "@/lib/i18n";
import { HeartIcon, TrashIcon } from "./icons";
import { ItemThumb } from "./item-thumb";
import { Highlight } from "./highlight";

export function ItemRow({
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
      className="group flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-card px-3 py-2 transition-colors hover:border-line-strong hover:bg-paper-2/40"
    >
      <div className="h-12 w-10 shrink-0 overflow-hidden rounded border border-line">
        <ItemThumb item={item} variant="mini" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-sm text-ink">
          <Highlight text={item.title} q={query} />
        </h3>
        {snippet && (
          <p className="mt-0.5 truncate text-[11px] leading-relaxed text-muted">
            <Highlight text={snippet} q={query} />
          </p>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          <span
            className="rounded px-1.5 py-px text-[10px] text-white"
            style={{ backgroundColor: phase?.accent ?? "#777" }}
          >
            {KIND_LABEL[item.kind]}
          </span>
          {item.year && <span className="tabular-nums">{item.year}</span>}
          {showPhase && <span>{phase?.title}</span>}
          {item.tags?.slice(0, 4).map((tg) => (
            <span key={tg} className="rounded bg-paper-2 px-1.5 py-px">
              #{tg}
            </span>
          ))}
        </div>
      </div>

      {item.size ? (
        <span className="shrink-0 text-[11px] tabular-nums text-muted">
          {formatBytes(item.size)}
        </span>
      ) : null}

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(item);
          }}
          title={isFav ? t.unfav : t.fav}
          className={`rounded-full p-1.5 transition-colors ${
            isFav ? "text-rose-500" : "text-muted opacity-0 hover:text-rose-400 group-hover:opacity-100"
          }`}
        >
          <HeartIcon className="h-4 w-4" filled={isFav} />
        </button>
        {deletable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            title={t.card_delete}
            className="rounded-full p-1.5 text-muted opacity-0 transition-colors hover:text-accent group-hover:opacity-100"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
