"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ItemThumb } from "@/components/item-thumb";
import { useStructure } from "@/components/structure-provider";
import { KIND_LABEL, formatDate } from "@/lib/ui";
import { t, nItems } from "@/lib/i18n";
import type { ResearchItem } from "@/lib/types";

export default function TrashPage() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const { map: phaseMap } = useStructure();

  useEffect(() => {
    fetch("/api/trash")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function restore(id: string) {
    setBusy(id);
    await fetch(`/api/trash/${id}`, { method: "POST" }).catch(() => {});
    setItems((p) => p.filter((i) => i.id !== id));
    setBusy(null);
  }

  async function purge(id: string) {
    setBusy(id);
    await fetch(`/api/trash/${id}`, { method: "DELETE" }).catch(() => {});
    setItems((p) => p.filter((i) => i.id !== id));
    setBusy(null);
  }

  async function emptyAll() {
    if (!confirm(t.trash_confirmEmpty)) return;
    setBusy("__all__");
    await fetch("/api/trash", { method: "DELETE" }).catch(() => {});
    setItems([]);
    setBusy(null);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 pb-20">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-ink">{t.trash_title}</h1>
            <p className="mt-1 text-sm text-muted">{t.trash_desc}</p>
          </div>
          {items.length > 0 && (
            <button
              onClick={emptyAll}
              disabled={busy === "__all__"}
              className="rounded-full border border-line-strong px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {t.trash_emptyAll}（{items.length}）
            </button>
          )}
        </header>

        <div className="mb-2 text-xs text-muted">
          {loading ? t.loading : nItems(items.length)}
        </div>

        {!loading && items.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card/60 px-6 py-16 text-center">
            <p className="font-serif text-lg text-ink-soft">{t.trash_empty}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const phase = phaseMap[item.phase];
              return (
                <article
                  key={item.id}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-card p-2.5"
                >
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-paper-2">
                    <ItemThumb item={item} variant="mini" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{item.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span style={{ color: phase?.accent }}>{phase?.title}</span>
                      <span>·</span>
                      <span>{KIND_LABEL[item.kind]}</span>
                      {item.deletedAt && (
                        <>
                          <span>·</span>
                          <span>
                            {t.trash_deletedAt} {formatDate(item.deletedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => restore(item.id)}
                    disabled={busy === item.id}
                    className="flex-shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {t.trash_restore}
                  </button>
                  <button
                    onClick={() => purge(item.id)}
                    disabled={busy === item.id}
                    className="flex-shrink-0 rounded-lg border border-line-strong px-3 py-1.5 text-xs text-muted transition-colors hover:border-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    {t.trash_purge}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
