"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Highlight } from "@/components/highlight";
import { t, nItems } from "@/lib/i18n";
import { useStructure } from "@/components/structure-provider";
import type { Reading } from "@/lib/types";

export default function ReadingsPage() {
  const [all, setAll] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [scope, setScope] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const { phases } = useStructure();

  useEffect(() => {
    fetch("/api/readings")
      .then((r) => r.json())
      .then((d) => setAll(d.readings ?? []))
      .finally(() => setLoading(false));
  }, []);

  const tags = useMemo(() => {
    const c = new Map<string, number>();
    all.forEach((r) => r.tags?.forEach((tg) => c.set(tg, (c.get(tg) ?? 0) + 1)));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  }, [all]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((r) => (scope ? r.phase === scope : true))
      .filter((r) => (unreadOnly ? !r.read : true))
      .filter((r) => (tag ? r.tags?.includes(tag) : true))
      .filter((r) =>
        !needle ? true : [r.citation, r.note, ...(r.tags ?? [])].join(" ").toLowerCase().includes(needle),
      );
  }, [all, q, tag, unreadOnly, scope]);

  async function patch(id: string, body: Partial<Reading>) {
    setAll((p) => p.map((r) => (r.id === id ? { ...r, ...body } : r)));
    await fetch(`/api/readings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  async function remove(id: string) {
    setAll((p) => p.filter((r) => r.id !== id));
    await fetch(`/api/readings/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function add() {
    const citation = draft.trim();
    if (!citation) return;
    const res = await fetch("/api/readings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ citation }),
    });
    const d = await res.json();
    if (d.reading) setAll((p) => [d.reading, ...p]);
    setDraft("");
    setAdding(false);
  }

  const readCount = all.filter((r) => r.read).length;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 pb-20">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-ink">{t.read_title}</h1>
            <p className="mt-1 text-sm text-muted">{t.read_desc}</p>
          </div>
          <button
            onClick={() => setAdding((v) => !v)}
            className="rounded-full bg-accent px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          >
            + {t.read_add}
          </button>
        </header>

        {adding && (
          <div className="mb-4 rounded-[var(--radius-card)] border border-line bg-card p-3">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.read_addPh}
              className="h-20 w-full resize-none rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            <div className="mt-2 flex gap-2">
              <button onClick={add} className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white">{t.read_save}</button>
              <button onClick={() => { setAdding(false); setDraft(""); }} className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink-soft">{t.read_cancel}</button>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.read_search}
            className="w-full max-w-md rounded-full border border-line-strong bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="rounded-full border border-line-strong bg-card px-2.5 py-1 text-xs text-ink-soft outline-none focus:border-accent"
            >
              <option value="">{t.scope_all}</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>{p.parent ? `· ${p.title}` : p.title}</option>
              ))}
            </select>
            <button
              onClick={() => setUnreadOnly((v) => !v)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                unreadOnly ? "bg-accent text-white" : "bg-paper-2 text-ink-soft hover:bg-line"
              }`}
            >
              {t.read_onlyUnread}
            </button>
            {tags.map((tg) => (
              <button
                key={tg}
                onClick={() => setTag(tag === tg ? "" : tg)}
                className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                  tag === tg ? "bg-accent text-white" : "bg-paper-2 text-ink-soft hover:bg-line"
                }`}
              >
                #{tg}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-2 text-xs text-muted">
          {loading ? t.loading : `${nItems(filtered.length)} · ${readCount}/${all.length} ${t.read_markRead}`}
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card/60 px-6 py-16 text-center font-serif text-ink-soft">
            {t.read_none}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((r) => (
              <article key={r.id} className="rounded-[var(--radius-card)] border border-line bg-card p-3.5">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => patch(r.id, { read: !r.read })}
                    title={r.read ? t.read_markRead : t.read_markUnread}
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border transition-colors ${
                      r.read ? "border-accent bg-accent" : "border-line-strong"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[14px] leading-relaxed ${r.read ? "text-ink-soft" : "text-ink"}`}>
                      <Highlight text={r.citation} q={q.trim()} />
                    </p>
                    {(r.note || noteOpen === r.id) && (
                      noteOpen === r.id ? (
                        <textarea
                          autoFocus
                          defaultValue={r.note ?? ""}
                          onBlur={(e) => { patch(r.id, { note: e.target.value }); setNoteOpen(null); }}
                          className="mt-1.5 h-16 w-full resize-none rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent"
                        />
                      ) : (
                        <p onClick={() => setNoteOpen(r.id)} className="mt-1 cursor-text text-[13px] leading-relaxed text-ink-soft">
                          <span className="text-muted">{t.ev_note}: </span>{r.note}
                        </p>
                      )
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      {r.year && <span className="tabular-nums">{r.year}</span>}
                      <select
                        value={r.phase ?? ""}
                        onChange={(e) => patch(r.id, { phase: e.target.value || undefined })}
                        className="rounded border border-line bg-paper-2 px-1 py-0.5 text-[11px] text-ink-soft outline-none focus:border-accent"
                        title={t.scope_all}
                      >
                        <option value="">—</option>
                        {phases.map((p) => (
                          <option key={p.id} value={p.id}>{p.parent ? `· ${p.title}` : p.title}</option>
                        ))}
                      </select>
                      {r.tags?.map((tg) => (
                        <button key={tg} onClick={() => setTag(tg)} className="rounded bg-paper-2 px-1.5 py-0.5 hover:bg-line">#{tg}</button>
                      ))}
                      {!r.note && noteOpen !== r.id && (
                        <button onClick={() => setNoteOpen(r.id)} className="hover:text-accent">+ {t.ev_note}</button>
                      )}
                      <button onClick={() => remove(r.id)} className="ml-auto hover:text-accent">{t.v_delete}</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
