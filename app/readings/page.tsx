"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Highlight } from "@/components/highlight";
import { t, nItems } from "@/lib/i18n";
import { useStructure } from "@/components/structure-provider";
import type { Reading, RefType } from "@/lib/types";
import { formatCitation, readingToBibtex, readingToRis, exportReadings } from "@/lib/reference";

const REF_TYPES: RefType[] = ["article", "book", "chapter", "thesis", "report", "web", "other"];
const TYPE_LABEL: Record<RefType, string> = {
  article: t.rt_article, book: t.rt_book, chapter: t.rt_chapter, thesis: t.rt_thesis,
  report: t.rt_report, web: t.rt_web, other: t.rt_other,
};

type FormState = {
  type: RefType; authorsText: string; title: string; container: string; publisher: string;
  volume: string; issue: string; pages: string; doi: string; url: string; year: string; citation: string;
};
const EMPTY_FORM: FormState = {
  type: "article", authorsText: "", title: "", container: "", publisher: "",
  volume: "", issue: "", pages: "", doi: "", url: "", year: "", citation: "",
};
function readingToForm(r: Reading): FormState {
  return {
    type: r.type ?? "other", authorsText: (r.authors ?? []).join("\n"),
    title: r.title ?? "", container: r.container ?? "", publisher: r.publisher ?? "",
    volume: r.volume ?? "", issue: r.issue ?? "", pages: r.pages ?? "",
    doi: r.doi ?? "", url: r.url ?? "", year: r.year ?? "", citation: r.title ? "" : r.citation,
  };
}
function formToBody(f: FormState) {
  return {
    type: f.type,
    authors: f.authorsText.split(/[;\n]/).map((s) => s.trim()).filter(Boolean),
    title: f.title.trim(), container: f.container.trim(), publisher: f.publisher.trim(),
    volume: f.volume.trim(), issue: f.issue.trim(), pages: f.pages.trim(),
    doi: f.doi.trim(), url: f.url.trim(), year: f.year.trim(), citation: f.citation.trim(),
  };
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const inputCls =
  "w-full rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent";

function RefFields({ f, set }: { f: FormState; set: (patch: Partial<FormState>) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      <select value={f.type} onChange={(e) => set({ type: e.target.value as RefType })}
        className={`col-span-2 ${inputCls}`}>
        {REF_TYPES.map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
      </select>
      <input value={f.year} onChange={(e) => set({ year: e.target.value })} placeholder={t.rf_year}
        className={`col-span-2 ${inputCls}`} />
      <div className="col-span-2" />
      <textarea value={f.authorsText} onChange={(e) => set({ authorsText: e.target.value })}
        placeholder={`${t.rf_authors} — ${t.rf_authors_ph}`} rows={2}
        className={`col-span-6 resize-y ${inputCls}`} />
      <input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder={t.rf_title}
        className={`col-span-6 ${inputCls}`} />
      <input value={f.container} onChange={(e) => set({ container: e.target.value })} placeholder={t.rf_container}
        className={`col-span-3 ${inputCls}`} />
      <input value={f.publisher} onChange={(e) => set({ publisher: e.target.value })} placeholder={t.rf_publisher}
        className={`col-span-3 ${inputCls}`} />
      <input value={f.volume} onChange={(e) => set({ volume: e.target.value })} placeholder={t.rf_volume}
        className={`col-span-1 ${inputCls}`} />
      <input value={f.issue} onChange={(e) => set({ issue: e.target.value })} placeholder={t.rf_issue}
        className={`col-span-1 ${inputCls}`} />
      <input value={f.pages} onChange={(e) => set({ pages: e.target.value })} placeholder={t.rf_pages}
        className={`col-span-2 ${inputCls}`} />
      <input value={f.doi} onChange={(e) => set({ doi: e.target.value })} placeholder={t.rf_doi}
        className={`col-span-2 ${inputCls}`} />
      <input value={f.url} onChange={(e) => set({ url: e.target.value })} placeholder={t.rf_url}
        className={`col-span-6 ${inputCls}`} />
    </div>
  );
}

const CITE_STYLES = [
  { key: "apa", label: t.cite_apa }, { key: "chicago", label: t.cite_chicago },
  { key: "gbt", label: t.cite_gbt }, { key: "bibtex", label: t.cite_bibtex }, { key: "ris", label: t.cite_ris },
] as const;

function citeText(r: Reading, key: (typeof CITE_STYLES)[number]["key"]): string {
  if (key === "bibtex") return readingToBibtex(r);
  if (key === "ris") return readingToRis(r);
  return formatCitation(r, key);
}

export default function ReadingsPage() {
  const [all, setAll] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [scope, setScope] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [citeOpen, setCiteOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [copied, setCopied] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const { phases } = useStructure();

  // 添加/导入面板
  const [addMode, setAddMode] = useState<"doi" | "paste" | "manual" | null>(null);
  const [doi, setDoi] = useState("");
  const [paste, setPaste] = useState("");
  const [manual, setManual] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/readings").then((r) => r.json()).then((d) => setAll(d.readings ?? [])).finally(() => setLoading(false));
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
        !needle ? true
          : [r.citation, r.title, r.note, r.authors?.join(" "), r.container, ...(r.tags ?? [])]
              .filter(Boolean).join(" ").toLowerCase().includes(needle),
      );
  }, [all, q, tag, unreadOnly, scope]);

  async function patch(id: string, body: Partial<Reading>) {
    setAll((p) => p.map((r) => (r.id === id ? { ...r, ...body } : r)));
    await fetch(`/api/readings/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).catch(() => {});
  }
  async function remove(id: string) {
    setAll((p) => p.filter((r) => r.id !== id));
    await fetch(`/api/readings/${id}`, { method: "DELETE" }).catch(() => {});
  }

  function showFlash(ok: boolean, msg: string) {
    setFlash({ ok, msg });
    setTimeout(() => setFlash(null), 2600);
  }

  async function importDoi() {
    if (!doi.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/readings/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doi: doi.trim(), phase: scope || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { showFlash(false, `${t.read_import_fail}：${d.error ?? res.status}`); return; }
      setAll((p) => [...(d.readings as Reading[]), ...p]);
      setDoi("");
      showFlash(true, `${t.read_imported} · ${d.readings.length}`);
    } catch {
      showFlash(false, t.read_import_fail);
    } finally { setBusy(false); }
  }

  async function importPaste() {
    if (!paste.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/readings/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: paste, phase: scope || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { showFlash(false, `${t.read_import_fail}：${d.error ?? res.status}`); return; }
      setAll((p) => [...(d.readings as Reading[]), ...p]);
      setPaste("");
      showFlash(true, `${t.read_imported} · ${d.readings.length}`);
    } catch {
      showFlash(false, t.read_import_fail);
    } finally { setBusy(false); }
  }

  async function addManual() {
    const body = formToBody(manual);
    if (!body.title && !body.citation) return;
    setBusy(true);
    try {
      const res = await fetch("/api/readings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, phase: scope || undefined }),
      });
      const d = await res.json();
      if (d.reading) { setAll((p) => [d.reading, ...p]); setManual(EMPTY_FORM); showFlash(true, `${t.read_imported} · 1`); }
    } finally { setBusy(false); }
  }

  async function saveEdit(id: string) {
    const body = formToBody(editForm);
    const res = await fetch(`/api/readings/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.reading) setAll((p) => p.map((r) => (r.id === id ? d.reading : r)));
    setEditing(null);
  }

  async function copy(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1200); } catch {}
  }

  function doExport(fmt: "bibtex" | "ris" | "apa" | "chicago" | "gbt") {
    const ext = fmt === "bibtex" ? "bib" : fmt === "ris" ? "ris" : "txt";
    download(`rainrain-readings.${ext}`, exportReadings(filtered, fmt));
    setExportOpen(false);
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
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setExportOpen((v) => !v); }}
                className="rounded-full border border-line-strong px-3.5 py-2 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent">
                {t.read_export}
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-line bg-card py-1 shadow-lg">
                  {(["bibtex", "ris", "apa", "chicago", "gbt"] as const).map((fmt) => (
                    <button key={fmt} onClick={() => doExport(fmt)}
                      className="block w-full px-3 py-1.5 text-left text-sm text-ink-soft hover:bg-paper-2">
                      {fmt === "bibtex" ? t.cite_bibtex : fmt === "ris" ? t.cite_ris
                        : fmt === "apa" ? t.cite_apa : fmt === "chicago" ? t.cite_chicago : t.cite_gbt}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setAddMode((v) => (v ? null : "doi"))}
              className="rounded-full bg-accent px-4 py-2 text-sm text-white transition-opacity hover:opacity-90">
              + {t.read_add}
            </button>
          </div>
        </header>

        {addMode && (
          <div className="mb-4 rounded-[var(--radius-card)] border border-line bg-card p-3.5">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {([["doi", t.read_add_doi], ["paste", t.read_add_paste], ["manual", t.read_add_manual]] as const).map(
                ([m, label]) => (
                  <button key={m} onClick={() => setAddMode(m)}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      addMode === m ? "bg-accent text-white" : "bg-paper-2 text-ink-soft hover:bg-line"
                    }`}>
                    {label}
                  </button>
                ),
              )}
            </div>

            {addMode === "doi" && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input autoFocus value={doi} onChange={(e) => setDoi(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && importDoi()} placeholder={t.read_doi_ph}
                    className="flex-1 rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
                  <button onClick={importDoi} disabled={busy}
                    className="whitespace-nowrap rounded-lg bg-accent px-3.5 py-2 text-sm text-white disabled:opacity-60">
                    {busy ? t.read_importing : t.read_doi_import}
                  </button>
                </div>
              </div>
            )}

            {addMode === "paste" && (
              <div className="flex flex-col gap-2">
                <textarea autoFocus value={paste} onChange={(e) => setPaste(e.target.value)}
                  placeholder={t.read_paste_ph} rows={6}
                  className="w-full resize-y rounded-lg border border-line-strong bg-paper px-3 py-2 font-mono text-[12px] text-ink outline-none focus:border-accent" />
                <div className="flex items-center gap-3">
                  <button onClick={importPaste} disabled={busy}
                    className="rounded-lg bg-accent px-3.5 py-2 text-sm text-white disabled:opacity-60">
                    {busy ? t.read_importing : t.read_paste_import}
                  </button>
                  <span className="text-xs text-muted">{t.read_paste_hint}</span>
                </div>
              </div>
            )}

            {addMode === "manual" && (
              <div className="flex flex-col gap-2.5">
                <RefFields f={manual} set={(patch) => setManual((s) => ({ ...s, ...patch }))} />
                <textarea value={manual.citation} onChange={(e) => setManual((s) => ({ ...s, citation: e.target.value }))}
                  placeholder={t.read_add_quick} rows={2}
                  className="w-full resize-y rounded-lg border border-dashed border-line-strong bg-paper px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent" />
                <div>
                  <button onClick={addManual} disabled={busy}
                    className="rounded-lg bg-accent px-3.5 py-2 text-sm text-white disabled:opacity-60">{t.read_save}</button>
                </div>
              </div>
            )}

            {flash && (
              <p className={`mt-2 text-xs ${flash.ok ? "text-accent" : "text-red-500"}`}>{flash.msg}</p>
            )}
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.read_search}
            className="w-full max-w-md rounded-full border border-line-strong bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-accent" />
          <div className="flex flex-wrap items-center gap-1.5">
            <select value={scope} onChange={(e) => setScope(e.target.value)}
              className="rounded-full border border-line-strong bg-card px-2.5 py-1 text-xs text-ink-soft outline-none focus:border-accent">
              <option value="">{t.scope_all}</option>
              {phases.map((p) => <option key={p.id} value={p.id}>{p.parent ? `· ${p.title}` : p.title}</option>)}
            </select>
            <button onClick={() => setUnreadOnly((v) => !v)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                unreadOnly ? "bg-accent text-white" : "bg-paper-2 text-ink-soft hover:bg-line"
              }`}>
              {t.read_onlyUnread}
            </button>
            {tags.map((tg) => (
              <button key={tg} onClick={() => setTag(tag === tg ? "" : tg)}
                className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                  tag === tg ? "bg-accent text-white" : "bg-paper-2 text-ink-soft hover:bg-line"
                }`}>
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
            {filtered.map((r) => {
              const structured = !!r.title;
              const meta = [r.authors?.join(", "), r.year, r.container].filter(Boolean).join(" · ");
              const volLine = [r.volume ? `${r.volume}${r.issue ? `(${r.issue})` : ""}` : "", r.pages]
                .filter(Boolean).join(": ");
              return (
                <article key={r.id} className="rounded-[var(--radius-card)] border border-line bg-card p-3.5">
                  {editing === r.id ? (
                    <div className="flex flex-col gap-2.5">
                      <RefFields f={editForm} set={(patch) => setEditForm((s) => ({ ...s, ...patch }))} />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(r.id)} className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white">{t.read_save}</button>
                        <button onClick={() => setEditing(null)} className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink-soft">{t.read_cancel}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <button onClick={() => patch(r.id, { read: !r.read })}
                        title={r.read ? t.read_markRead : t.read_markUnread}
                        className={`mt-1 h-4 w-4 flex-shrink-0 rounded-full border transition-colors ${
                          r.read ? "border-accent bg-accent" : "border-line-strong"
                        }`} />
                      <div className="min-w-0 flex-1">
                        {structured ? (
                          <>
                            <p className={`text-[15px] font-medium leading-snug ${r.read ? "text-ink-soft" : "text-ink"}`}>
                              <Highlight text={r.title!} q={q.trim()} />
                            </p>
                            {meta && (
                              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                                <Highlight text={meta} q={q.trim()} />{volLine ? ` · ${volLine}` : ""}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className={`text-[14px] leading-relaxed ${r.read ? "text-ink-soft" : "text-ink"}`}>
                            <Highlight text={r.citation} q={q.trim()} />
                          </p>
                        )}

                        {(r.note || noteOpen === r.id) && (
                          noteOpen === r.id ? (
                            <textarea autoFocus defaultValue={r.note ?? ""}
                              onBlur={(e) => { patch(r.id, { note: e.target.value }); setNoteOpen(null); }}
                              className="mt-1.5 h-16 w-full resize-none rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent" />
                          ) : (
                            <p onClick={() => setNoteOpen(r.id)} className="mt-1 cursor-text text-[13px] leading-relaxed text-ink-soft">
                              <span className="text-muted">{t.ev_note}: </span>{r.note}
                            </p>
                          )
                        )}

                        {citeOpen === r.id && (
                          <div className="mt-2 rounded-lg border border-line bg-paper-2 p-2">
                            <div className="flex flex-wrap gap-1.5">
                              {CITE_STYLES.map((s) => (
                                <button key={s.key} onClick={() => copy(citeText(r, s.key), `${r.id}:${s.key}`)}
                                  className="rounded-md border border-line-strong bg-card px-2 py-1 text-[11px] text-ink-soft hover:border-accent hover:text-accent">
                                  {copied === `${r.id}:${s.key}` ? `✓ ${t.read_copied}` : s.label}
                                </button>
                              ))}
                            </div>
                            <p className="mt-1.5 text-[11px] text-muted">{t.cite_hint}</p>
                          </div>
                        )}

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                          {structured && r.type && (
                            <span className="rounded bg-paper-2 px-1.5 py-0.5 text-accent">{TYPE_LABEL[r.type]}</span>
                          )}
                          <select value={r.phase ?? ""} onChange={(e) => patch(r.id, { phase: e.target.value || undefined })}
                            className="rounded border border-line bg-paper-2 px-1 py-0.5 text-[11px] text-ink-soft outline-none focus:border-accent" title={t.scope_all}>
                            <option value="">—</option>
                            {phases.map((p) => <option key={p.id} value={p.id}>{p.parent ? `· ${p.title}` : p.title}</option>)}
                          </select>
                          {r.tags?.map((tg) => (
                            <button key={tg} onClick={() => setTag(tg)} className="rounded bg-paper-2 px-1.5 py-0.5 hover:bg-line">#{tg}</button>
                          ))}
                          {r.doi && (
                            <a href={`https://doi.org/${r.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")}`} target="_blank" rel="noreferrer"
                              className="hover:text-accent">DOI</a>
                          )}
                          <button onClick={() => setCiteOpen(citeOpen === r.id ? null : r.id)} className="hover:text-accent">{t.read_cite}</button>
                          <button onClick={() => { setEditing(r.id); setEditForm(readingToForm(r)); }} className="hover:text-accent">{t.read_edit}</button>
                          {!r.note && noteOpen !== r.id && (
                            <button onClick={() => setNoteOpen(r.id)} className="hover:text-accent">+ {t.ev_note}</button>
                          )}
                          <button onClick={() => remove(r.id)} className="ml-auto hover:text-accent">{t.v_delete}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
