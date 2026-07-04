"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { BrushRule, InkEmpty, InkLoading } from "@/components/ink-bits";
import { t } from "@/lib/i18n";

type Note = { id: string; title: string; body: string; createdAt: string; updatedAt: string };
type Target = { id: string; title: string; type: "note" | "item" | "respondent"; phase?: string; kind?: string };

const norm = (s: string) => s.trim().toLowerCase();
function parseLinks(body: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const x = m[1].trim();
    if (x) out.push(x);
  }
  return [...new Set(out)];
}

const TYPE_LABEL: Record<Target["type"], string> = {
  note: t.link_note,
  item: t.link_item,
  respondent: t.link_respondent,
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; body: string }>({ title: "", body: "" });
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"" | "saving" | "saved" | "failed">("");
  const [roMsg, setRoMsg] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [ac, setAc] = useState<{ open: boolean; query: string; start: number; index: number }>({
    open: false, query: "", start: 0, index: 0,
  });
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function load() {
    return Promise.all([
      fetch("/api/notes").then((r) => r.json()),
      fetch("/api/link-targets").then((r) => r.json()),
    ]).then(([n, lt]) => {
      setNotes(n.notes ?? []);
      setTargets(lt.targets ?? []);
      return (n.notes ?? []) as Note[];
    });
  }

  useEffect(() => {
    load()
      .then((ns) => { if (ns.length) openNote(ns[0]); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeNote = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId]);

  function openNote(n: Note) {
    setActiveId(n.id);
    setDraft({ title: n.title, body: n.body });
    setDirty(false);
    setSaveState("");
    setAc((a) => ({ ...a, open: false }));
  }

  // resolve a [[name]] to a target (notes first)
  const resolve = (name: string): Target | null =>
    targets.find((tg) => norm(tg.title) === norm(name)) ?? null;

  // ---- create / save / delete ----
  async function createNote(title = "Untitled note", body = "") {
    try {
      const r = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!r.ok) throw new Error();
      const { note } = await r.json();
      await load();
      openNote(note);
      setTimeout(() => titleRef.current?.select(), 50);
    } catch {
      setRoMsg(true);
    }
  }

  async function save() {
    if (!activeId) return;
    setSaveState("saving");
    try {
      const r = await fetch(`/api/notes/${activeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!r.ok) throw new Error();
      setSaveState("saved");
      setDirty(false);
      await load();
      setTimeout(() => setSaveState(""), 1500);
    } catch {
      setSaveState("failed");
      setRoMsg(true);
    }
  }

  async function remove() {
    if (!activeId) return;
    if (!confirm(t.notes_deleteConfirm)) return;
    try {
      const r = await fetch(`/api/notes/${activeId}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      const rest = notes.filter((n) => n.id !== activeId);
      await load();
      if (rest.length) openNote(rest[0]); else { setActiveId(null); setDraft({ title: "", body: "" }); }
    } catch {
      setRoMsg(true);
    }
  }

  function onLinkClick(name: string) {
    const tg = resolve(name);
    if (!tg) { void createNote(name); return; }
    if (tg.type === "note") {
      const n = notes.find((x) => x.id === tg.id);
      if (n) openNote(n);
    } else if (tg.type === "item") {
      window.location.href = `/library?item=${encodeURIComponent(tg.id)}`;
    } else {
      window.location.href = `/respondents`;
    }
  }

  // ---- [[ autocomplete ----
  function onBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const caret = e.target.selectionStart ?? value.length;
    setDraft((d) => ({ ...d, body: value }));
    setDirty(true);
    const before = value.slice(0, caret);
    const open = before.lastIndexOf("[[");
    if (open >= 0) {
      const between = before.slice(open + 2);
      if (!between.includes("]") && !between.includes("[") && !between.includes("\n")) {
        setAc({ open: true, query: between, start: open, index: 0 });
        return;
      }
    }
    setAc((a) => (a.open ? { ...a, open: false } : a));
  }

  const acMatches = useMemo(() => {
    if (!ac.open) return [];
    const nq = norm(ac.query);
    const pool = nq ? targets.filter((tg) => norm(tg.title).includes(nq)) : targets;
    return pool.slice(0, 8);
  }, [ac, targets]);

  function applyAc(title: string) {
    setDraft((d) => {
      const end = ac.start + 2 + ac.query.length;
      const body = d.body.slice(0, ac.start) + `[[${title}]]` + d.body.slice(end);
      const pos = ac.start + title.length + 4;
      requestAnimationFrame(() => {
        const el = bodyRef.current;
        if (el) { el.focus(); el.setSelectionRange(pos, pos); }
      });
      return { ...d, body };
    });
    setDirty(true);
    setAc((a) => ({ ...a, open: false }));
  }

  function onBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!ac.open || !acMatches.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setAc((a) => ({ ...a, index: Math.min(a.index + 1, acMatches.length - 1) })); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAc((a) => ({ ...a, index: Math.max(a.index - 1, 0) })); }
    else if (e.key === "Enter") { e.preventDefault(); applyAc(acMatches[ac.index].title); }
    else if (e.key === "Escape") { e.preventDefault(); setAc((a) => ({ ...a, open: false })); }
  }

  // ---- derived: out-links, backlinks, stubs ----
  const outLinks = useMemo(() => parseLinks(draft.body), [draft.body]);
  const backlinks = useMemo(() => {
    if (!activeNote) return [];
    return notes.filter(
      (n) => n.id !== activeNote.id && parseLinks(n.body).some((l) => norm(l) === norm(activeNote.title)),
    );
  }, [notes, activeNote]);
  const stubs = useMemo(() => {
    const all = new Map<string, string>();
    for (const n of notes) for (const l of parseLinks(n.body)) if (!resolve(l)) all.set(norm(l), l);
    return [...all.values()].sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, targets]);

  const filteredNotes = useMemo(() => {
    const nq = norm(q);
    return notes.filter((n) => !nq || norm(n.title).includes(nq) || norm(n.body).includes(nq));
  }, [notes, q]);

  function renderInline(body: string) {
    const parts = body.split(/(\[\[[^\]]+\]\])/g);
    return parts.map((p, i) => {
      const m = /^\[\[([^\]]+)\]\]$/.exec(p);
      if (!m) return <span key={i}>{p}</span>;
      return <LinkChip key={i} name={m[1].trim()} />;
    });
  }

  function LinkChip({ name }: { name: string }) {
    const tg = resolve(name);
    const stub = !tg;
    const label = tg ? TYPE_LABEL[tg.type] : t.link_stub;
    return (
      <button
        onClick={() => onLinkClick(name)}
        title={label}
        className={`mx-0.5 inline-flex items-baseline gap-1 rounded px-1 py-0.5 text-[13px] align-baseline transition-colors ${
          stub
            ? "border border-dashed border-accent/60 text-accent/80 hover:bg-accent/10"
            : "bg-accent/10 text-accent hover:bg-accent/20"
        }`}
      >
        {name}
        <span className="text-[9px] uppercase opacity-60">{label}</span>
      </button>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 pb-20">
        <header className="mb-5">
          <h1 className="font-serif text-3xl text-ink">{t.notes_title}</h1>
          <BrushRule className="mt-1.5" />
          <p className="mt-1 max-w-2xl text-sm text-muted">{t.notes_desc}</p>
        </header>

        {roMsg && (
          <div className="mb-4 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            预览为只读演示，无法保存。安装桌面版即可编辑。 · This preview is read-only — install the desktop app to write.
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left: list + stubs */}
          <aside className="lg:w-72 lg:shrink-0">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => createNote()}
                className="rounded-lg bg-accent px-3 py-2 text-sm text-white transition-opacity hover:opacity-90"
              >
                + {t.notes_new}
              </button>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.notes_search}
                className="w-full rounded-full border border-line-strong bg-card px-4 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <div className="flex flex-col gap-1">
                {loading ? (
                  <InkLoading />
                ) : filteredNotes.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted">{t.notes_empty}</p>
                ) : (
                  filteredNotes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openNote(n)}
                      className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        n.id === activeId ? "bg-accent/15 text-ink" : "text-ink-soft hover:bg-paper-2"
                      }`}
                    >
                      <div className="line-clamp-1 font-medium">{n.title}</div>
                      <div className="line-clamp-1 text-[12px] text-muted">
                        {n.body.replace(/\[\[([^\]]+)\]\]/g, "$1").slice(0, 60) || "—"}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {stubs.length > 0 && (
                <div className="mt-2 rounded-[var(--radius-card)] border border-line bg-card p-3">
                  <p className="text-xs font-medium text-muted">{t.notes_stubs} · {stubs.length}</p>
                  <p className="mb-2 mt-0.5 text-[11px] text-muted">{t.notes_stubsDesc}</p>
                  <div className="flex flex-col gap-1">
                    {stubs.map((s) => (
                      <button
                        key={s}
                        onClick={() => createNote(s)}
                        className="flex items-center justify-between rounded px-2 py-1 text-left text-[13px] text-accent/90 hover:bg-accent/10"
                      >
                        <span className="line-clamp-1">{s}</span>
                        <span className="shrink-0 text-[10px] text-muted">{t.notes_createStub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Right: editor */}
          <section className="flex-1">
            {!activeNote ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-10 text-center text-muted">
                <InkEmpty hint={t.notes_empty} />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      ref={titleRef}
                      value={draft.title}
                      onChange={(e) => { setDraft((d) => ({ ...d, title: e.target.value })); setDirty(true); }}
                      placeholder={t.notes_titlePh}
                      className="flex-1 border-none bg-transparent font-serif text-xl text-ink outline-none"
                    />
                    <div className="flex shrink-0 items-center gap-1 rounded-full border border-line-strong p-0.5 text-xs">
                      <button onClick={() => setMode("edit")} className={`rounded-full px-2.5 py-1 ${mode === "edit" ? "bg-accent text-white" : "text-muted"}`}>{t.notes_edit}</button>
                      <button onClick={() => setMode("preview")} className={`rounded-full px-2.5 py-1 ${mode === "preview" ? "bg-accent text-white" : "text-muted"}`}>{t.notes_preview}</button>
                    </div>
                  </div>

                  {mode === "edit" ? (
                    <div className="relative">
                      <textarea
                        ref={bodyRef}
                        value={draft.body}
                        onChange={onBodyChange}
                        onKeyDown={onBodyKeyDown}
                        placeholder={t.notes_bodyPh}
                        rows={16}
                        className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-accent"
                      />
                      {ac.open && acMatches.length > 0 && (
                        <div className="absolute left-3 right-3 top-2 z-10 max-h-60 overflow-y-auto rounded-lg border border-line-strong bg-card shadow-lg">
                          {acMatches.map((tg, i) => (
                            <button
                              key={`${tg.type}-${tg.id}`}
                              onMouseDown={(e) => { e.preventDefault(); applyAc(tg.title); }}
                              className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] ${i === ac.index ? "bg-accent/15" : "hover:bg-paper-2"}`}
                            >
                              <span className="line-clamp-1 text-ink">{tg.title}</span>
                              <span className="shrink-0 text-[10px] uppercase text-muted">{TYPE_LABEL[tg.type]}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="min-h-[16rem] whitespace-pre-wrap rounded-lg bg-paper px-3 py-2.5 text-[14px] leading-relaxed text-ink-soft">
                      {draft.body ? renderInline(draft.body) : <span className="text-muted">{t.notes_none}</span>}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={save}
                      disabled={!dirty || saveState === "saving"}
                      className="rounded-lg bg-accent px-4 py-1.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {saveState === "saving" ? t.notes_saving : saveState === "saved" ? t.notes_saved : t.notes_save}
                    </button>
                    {saveState === "failed" && <span className="text-[13px] text-rose-500">✗</span>}
                    <button onClick={remove} className="ml-auto text-[13px] text-muted hover:text-rose-500">{t.notes_delete}</button>
                  </div>
                </div>

                {/* Links + backlinks */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
                    <p className="mb-2 text-xs font-medium text-muted">{t.notes_links} · {outLinks.length}</p>
                    {outLinks.length === 0 ? (
                      <p className="text-[13px] text-muted">{t.notes_none}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">{outLinks.map((l) => <LinkChip key={l} name={l} />)}</div>
                    )}
                  </div>
                  <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
                    <p className="mb-2 text-xs font-medium text-muted">{t.notes_backlinks} · {backlinks.length}</p>
                    {backlinks.length === 0 ? (
                      <p className="text-[13px] text-muted">{t.notes_none}</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {backlinks.map((n) => (
                          <button key={n.id} onClick={() => openNote(n)} className="rounded px-2 py-1 text-left text-[13px] text-accent hover:bg-accent/10">
                            {n.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
