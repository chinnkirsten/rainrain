"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ItemKind } from "@/lib/types";
import { t } from "@/lib/i18n";
import { KindIcon } from "./icons";

type Recent = {
  id: string;
  title: string;
  phase: string;
  kind: ItemKind;
  src?: string;
  cover?: string;
};

export function RecentStrip() {
  const [items, setItems] = useState<Recent[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        setItems(JSON.parse(localStorage.getItem("lib:recent") || "[]"));
      } catch {}
    };
    load();
    window.addEventListener("lib:recent", load);
    return () => window.removeEventListener("lib:recent", load);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-4">
      <h2 className="mb-4 font-serif text-xl text-ink">{t.home_recent_viewed}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 rr-stagger">
        {items.map((it) => {
          const img = it.kind === "image" ? it.src : it.cover;
          return (
            <Link
              key={it.id}
              href={`/research/${it.phase}`}
              title={it.title}
              className="group flex w-28 shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-card transition-colors hover:border-line-strong"
            >
              <div className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-paper-2">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={it.title}
                    loading="lazy"
                    className="h-full w-full object-cover object-top transition-transform group-hover:scale-[1.03]"
                  />
                ) : (
                  <KindIcon kind={it.kind} className="h-7 w-7 text-muted opacity-50" />
                )}
              </div>
              <span className="truncate px-2 py-1.5 text-[11px] text-ink-soft">{it.title}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
