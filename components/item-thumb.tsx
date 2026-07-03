import type { ResearchItem } from "@/lib/types";
import { KIND_LABEL, KIND_TINT } from "@/lib/ui";
import { KindIcon } from "./icons";

/**
 * 条目缩略图：图片→原图；有书封→书封；都没有→按类型做一张「文字封面」。
 * variant: "card"（网格大图，含标题排版）| "mini"（列表小图标）
 */
export function ItemThumb({
  item,
  variant = "card",
}: {
  item: ResearchItem;
  variant?: "card" | "mini";
}) {
  if (item.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={item.src}
        alt={item.title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
      />
    );
  }
  if (item.cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={item.cover}
        alt={item.title}
        loading="lazy"
        className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.04]"
      />
    );
  }

  const tint = KIND_TINT[item.kind];

  if (variant === "mini") {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${tint}1f, ${tint}0a)` }}
      >
        <KindIcon kind={item.kind} className="h-5 w-5" style={{ color: tint }} />
      </div>
    );
  }

  // 文字封面
  return (
    <div
      className="relative flex h-full w-full flex-col justify-end p-3"
      style={{ background: `linear-gradient(150deg, ${tint}24, ${tint}0a 55%, transparent)` }}
    >
      <KindIcon
        kind={item.kind}
        className="absolute right-2.5 top-2.5 h-6 w-6"
        style={{ color: tint, opacity: 0.4 }}
      />
      <p
        className="font-serif text-[13.5px] leading-snug line-clamp-4"
        style={{ color: `color-mix(in srgb, ${tint} 78%, var(--color-ink))` }}
      >
        {item.title}
      </p>
      <span className="mt-1.5 text-[10px] uppercase tracking-wider" style={{ color: tint }}>
        {KIND_LABEL[item.kind]}
      </span>
    </div>
  );
}
