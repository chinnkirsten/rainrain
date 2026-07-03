"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Excerpt, PhaseId, ResearchItem } from "@/lib/types";
import { usePhase, useStructure } from "./structure-provider";
import { KIND_LABEL, formatBytes, formatDate } from "@/lib/ui";
import { citation } from "@/lib/cite";
import { t, LANG } from "@/lib/i18n";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  KindIcon,
  TrashIcon,
} from "./icons";
import dynamic from "next/dynamic";

// PDF 阅读器仅客户端渲染（pdf.js 依赖 DOM）
const PdfViewer = dynamic(() => import("./pdf-viewer").then((m) => m.PdfViewer), {
  ssr: false,
});

export function ItemViewer({
  item,
  onClose,
  onChanged,
  onDeleted,
  hasPrev = false,
  hasNext = false,
  onNavigate,
  related = [],
  onOpenRelated,
}: {
  item: ResearchItem;
  onClose: () => void;
  onChanged: (item: ResearchItem) => void;
  onDeleted: (id: string) => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onNavigate?: (delta: number) => void;
  related?: ResearchItem[];
  onOpenRelated?: (item: ResearchItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [excerpts, setExcerpts] = useState<Excerpt[]>([]);
  const [ai, setAi] = useState<{ busy: boolean; summary: string | null; error: string | null; copied: boolean }>({
    busy: false,
    summary: null,
    error: null,
    copied: false,
  });
  const [sel, setSel] = useState<{ text: string; top: number; left: number } | null>(null);
  const [exForm, setExForm] = useState<{ quote: string; note: string; tags: string; page: string } | null>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    title: item.title,
    description: item.description ?? "",
    year: item.year ?? "",
    phase: item.phase as PhaseId,
    tags: (item.tags ?? []).join(", "),
    author: item.author ?? "",
    publisher: item.publisher ?? "",
    archive: item.archive ?? "",
    callNumber: item.callNumber ?? "",
    edition: item.edition ?? "",
  });
  const editable = true; // 私人工具：所有材料（含内置种子）均可编辑/删除
  const phase = usePhase(item.phase);
  const { phases } = useStructure();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const tg = (e.target as HTMLElement | null)?.tagName;
      if (editing || tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT") return;
      if (e.key === "ArrowLeft" && hasPrev && onNavigate) {
        e.preventDefault();
        onNavigate(-1);
      } else if (e.key === "ArrowRight" && hasNext && onNavigate) {
        e.preventDefault();
        onNavigate(1);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onNavigate, hasPrev, hasNext, editing]);

  // 文档在线预览（docx/txt/md → HTML）
  useEffect(() => {
    const ext = (item.filename.split(".").pop() || "").toLowerCase();
    if (item.kind !== "doc" || !["docx", "txt", "md", "csv", "tsv"].includes(ext)) {
      setPreviewHtml(null);
      setPreviewState("idle");
      return;
    }
    let alive = true;
    setPreviewHtml(null);
    setPreviewState("loading");
    fetch(`/api/preview/${item.id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.text();
      })
      .then((html) => {
        if (alive) {
          setPreviewHtml(html);
          setPreviewState("ok");
        }
      })
      .catch(() => alive && setPreviewState("error"));
    return () => {
      alive = false;
    };
  }, [item.id, item.kind, item.filename]);

  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(citation(item));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  // 载入本条材料的证据摘录
  useEffect(() => {
    let alive = true;
    fetch(`/api/evidence?itemId=${item.id}`)
      .then((r) => r.json())
      .then((d) => alive && setExcerpts(d.evidence ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [item.id]);

  // 在文档预览里高亮已保存的引文
  const highlight = useCallback(() => {
    const c = docRef.current;
    if (!c) return;
    for (const e of excerpts) {
      const q = e.quote?.trim();
      if (!q || q.length < 2) continue;
      const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          (n as Text).parentElement?.closest("mark")
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      });
      let node: Node | null = walker.nextNode();
      while (node) {
        const idx = node.nodeValue?.indexOf(q) ?? -1;
        if (idx >= 0) {
          try {
            const range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + q.length);
            const mark = document.createElement("mark");
            mark.className = "ev-mark";
            range.surroundContents(mark);
          } catch {}
          break;
        }
        node = walker.nextNode();
      }
    }
  }, [excerpts]);

  useEffect(() => {
    if (previewState !== "ok") return;
    const id = setTimeout(highlight, 40);
    return () => clearTimeout(id);
  }, [previewState, previewHtml, excerpts, highlight]);

  function onDocMouseUp() {
    const s = window.getSelection();
    const text = s?.toString().trim() ?? "";
    if (!text || !docRef.current || !s || !docRef.current.contains(s.anchorNode)) {
      setSel(null);
      return;
    }
    const rect = s.getRangeAt(0).getBoundingClientRect();
    setSel({ text, top: rect.top - 6, left: rect.left + rect.width / 2 });
  }

  async function saveExcerpt() {
    if (!exForm || !exForm.quote.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          itemTitle: item.title,
          itemKind: item.kind,
          phase: item.phase,
          year: item.year,
          quote: exForm.quote.trim(),
          note: exForm.note,
          tags: exForm.tags,
          page: exForm.page,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? t.v_saveFailed);
      setExcerpts((p) => [d.excerpt, ...p]);
      setExForm(null);
      setSel(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeExcerpt(id: string) {
    await fetch(`/api/evidence/${id}`, { method: "DELETE" }).catch(() => {});
    setExcerpts((p) => p.filter((x) => x.id !== id));
  }

  async function runAiSummary() {
    setAi({ busy: true, summary: null, error: null, copied: false });
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const d = await res.json();
      if (res.ok) {
        setAi({ busy: false, summary: d.summary, error: null, copied: false });
      } else {
        const m: Record<string, string> = {
          OLLAMA_UNAVAILABLE: t.ai_unavailable,
          NO_MODEL: t.ai_noModel,
          NO_TEXT: t.ai_noText,
        };
        setAi({ busy: false, summary: null, error: m[d.error] || d.error || t.ai_failed, copied: false });
      }
    } catch {
      setAi({ busy: false, summary: null, error: t.ai_failed, copied: false });
    }
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          year: form.year,
          phase: form.phase,
          tags: form.tags,
          author: form.author,
          publisher: form.publisher,
          archive: form.archive,
          callNumber: form.callNumber,
          edition: form.edition,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.v_saveFailed);
      onChanged({ ...item, ...data.item });
      setEditing(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const msg =
      LANG === "zh"
        ? `把「${item.title}」移入回收站？之后可在回收站还原。`
        : `Move "${item.title}" to the recycle bin? You can restore it later.`;
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.v_deleteFailed);
      onDeleted(item.id);
    } catch (e) {
      alert((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line-strong bg-card shadow-2xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 预览 */}
        <div className="relative flex min-h-[240px] flex-1 items-center justify-center bg-paper-2 md:max-h-[92vh]">
          {onNavigate && hasPrev && (
            <button
              onClick={() => onNavigate(-1)}
              title={t.v_prev}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          )}
          {onNavigate && hasNext && (
            <button
              onClick={() => onNavigate(1)}
              title={t.v_next}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          )}
          {item.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.src}
              alt={item.title}
              className="max-h-[40vh] w-full object-contain md:max-h-[92vh]"
            />
          ) : item.kind === "pdf" ? (
            <PdfViewer src={item.src} title={item.title} />
          ) : item.kind === "audio" ? (
            <div className="flex w-full flex-col items-center gap-5 p-8">
              <KindIcon kind="audio" className="h-16 w-16 text-accent opacity-70" />
              <p className="max-w-full truncate text-sm text-ink-soft">{item.title}</p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={item.src} controls className="w-full max-w-md" />
            </div>
          ) : item.kind === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={item.src}
              controls
              className="max-h-[40vh] w-full md:max-h-[92vh]"
            />
          ) : item.kind === "doc" && (previewState === "loading" || previewState === "ok") ? (
            previewHtml ? (
              <div
                className="doc-preview h-[44vh] w-full overflow-y-auto bg-card px-6 py-6 text-left md:h-[92vh]"
                onMouseUp={onDocMouseUp}
              >
                <div
                  ref={docRef}
                  className="mx-auto max-w-2xl"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                {LANG === "zh" ? "载入预览…" : "Loading preview…"}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-4 p-10 text-muted">
              <KindIcon kind={item.kind} className="h-20 w-20 opacity-50" />
              <p className="text-sm">{KIND_LABEL[item.kind]} · {t.v_downloadToView}</p>
            </div>
          )}
        </div>

        {/* 侧栏 */}
        <div className="flex w-full shrink-0 flex-col border-t border-line md:w-80 md:border-l md:border-t-0">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: phase?.accent }}
            >
              {phase?.title}
            </span>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-muted hover:bg-paper-2 hover:text-ink"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {editing ? (
              <div className="flex flex-col gap-3 text-sm">
                <Field label={t.v_title}>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </Field>
                <Field label={t.v_descNotes}>
                  <textarea
                    className="input min-h-20 resize-y"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </Field>
                <div className="flex gap-3">
                  <Field label={t.v_year}>
                    <input
                      className="input"
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: e.target.value })}
                    />
                  </Field>
                  <Field label={t.v_phase}>
                    <select
                      className="input"
                      value={form.phase}
                      onChange={(e) =>
                        setForm({ ...form, phase: e.target.value as PhaseId })
                      }
                    >
                      {phases.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.parent ? `· ${p.title}` : p.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label={t.v_tagsLabel}>
                  <input
                    className="input"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder={t.v_tags_ph}
                  />
                </Field>

                <div className="mt-1 border-t border-line pt-2">
                  <p className="mb-1.5 text-[11px] text-muted">{t.bib_section}</p>
                  <div className="flex flex-col gap-2">
                    <Field label={t.bib_author}>
                      <input className="input" value={form.author}
                        onChange={(e) => setForm({ ...form, author: e.target.value })} />
                    </Field>
                    <div className="flex gap-2">
                      <Field label={t.bib_publisher}>
                        <input className="input" value={form.publisher}
                          onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
                      </Field>
                      <Field label={t.bib_edition}>
                        <input className="input" value={form.edition}
                          onChange={(e) => setForm({ ...form, edition: e.target.value })} />
                      </Field>
                    </div>
                    <div className="flex gap-2">
                      <Field label={t.bib_archive}>
                        <input className="input" value={form.archive}
                          onChange={(e) => setForm({ ...form, archive: e.target.value })} />
                      </Field>
                      <Field label={t.bib_callNumber}>
                        <input className="input" value={form.callNumber}
                          onChange={(e) => setForm({ ...form, callNumber: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                </div>

                <div className="mt-1 flex gap-2">
                  <button
                    onClick={save}
                    disabled={busy}
                    className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {busy ? t.v_saving : t.v_save}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-line-strong px-3 py-2 text-sm text-ink-soft"
                  >
                    {t.v_cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <h2 className="font-serif text-xl leading-snug">{item.title}</h2>
                {item.description && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                    {item.description}
                  </p>
                )}
                <dl className="flex flex-col gap-1.5 text-[13px] text-muted">
                  <Row k={t.v_type} v={KIND_LABEL[item.kind]} />
                  {item.year && <Row k={t.v_year} v={item.year} />}
                  {item.size ? <Row k={t.v_size} v={formatBytes(item.size)} /> : null}
                  {item.createdAt && (
                    <Row k={t.v_added} v={formatDate(item.createdAt)} />
                  )}
                  <Row k={t.v_file} v={item.filename} />
                </dl>
                <div className="rounded-lg bg-paper-2/50 p-2.5 text-[12px] leading-relaxed text-ink-soft">
                  <span className="text-[10px] text-muted">{t.bib_citation}</span>
                  <p className="mt-0.5 break-words">{citation(item)}</p>
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tg) => (
                      <span
                        key={tg}
                        className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-soft"
                      >
                        #{tg}
                      </span>
                    ))}
                  </div>
                )}

                {related.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1.5 border-t border-line pt-3">
                    <span className="text-xs text-muted">{t.v_related}</span>
                    {related.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onOpenRelated?.(r)}
                        className="flex items-center gap-2 rounded-lg border border-line bg-paper-2/40 px-2 py-1.5 text-left text-xs text-ink-soft transition-colors hover:border-accent hover:text-ink"
                      >
                        <KindIcon kind={r.kind} className="h-4 w-4 shrink-0 text-muted" />
                        <span className="truncate">{r.title}</span>
                        <span className="ml-auto shrink-0 text-[10px] text-muted">
                          {KIND_LABEL[r.kind]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* AI 摘要（本地 Ollama） */}
                {(item.kind === "doc" || item.kind === "pdf") && (
                  <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">{t.ai_section}</span>
                      {!ai.summary && (
                        <button
                          onClick={runAiSummary}
                          disabled={ai.busy}
                          className="text-[11px] text-accent hover:underline disabled:opacity-50"
                        >
                          {ai.busy ? t.ai_summarizing : `✦ ${t.ai_summarize}`}
                        </button>
                      )}
                    </div>
                    {ai.error && <p className="text-[11px] leading-snug text-muted">{ai.error}</p>}
                    {ai.summary && (
                      <div className="rounded-lg bg-paper-2/50 p-2.5">
                        <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink-soft">{ai.summary}</p>
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(ai.summary ?? "");
                              setAi((a) => ({ ...a, copied: true }));
                              setTimeout(() => setAi((a) => ({ ...a, copied: false })), 1500);
                            }}
                            className="hover:text-accent"
                          >
                            {ai.copied ? t.ai_copied : t.ai_copy}
                          </button>
                          <button onClick={runAiSummary} className="hover:text-accent">↻</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 证据摘录 */}
                <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">
                      {t.ev_count}
                      {excerpts.length ? ` · ${excerpts.length}` : ""}
                    </span>
                    <button
                      onClick={() => setExForm({ quote: "", note: "", tags: "", page: "" })}
                      className="text-[11px] text-accent hover:underline"
                    >
                      + {t.ev_add}
                    </button>
                  </div>
                  {excerpts.length === 0 ? (
                    <p className="text-[11px] text-muted">
                      {previewState === "ok" ? t.ev_hint_select : t.ev_none}
                    </p>
                  ) : (
                    excerpts.map((e) => (
                      <div key={e.id} className="rounded-lg bg-paper-2/50 p-2 text-[12px]">
                        <p className="leading-relaxed text-ink-soft">“{e.quote}”</p>
                        {e.note && <p className="mt-0.5 text-muted">— {e.note}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {e.page && (
                            <span className="text-[10px] text-muted">p.{e.page}</span>
                          )}
                          {e.tags?.map((tg) => (
                            <span key={tg} className="rounded bg-card px-1 text-[10px] text-muted">
                              #{tg}
                            </span>
                          ))}
                          <button
                            onClick={() => removeExcerpt(e.id)}
                            className="ml-auto text-[10px] text-muted hover:text-accent"
                          >
                            {t.v_delete}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 操作 */}
          {!editing && (
            <div className="flex items-center gap-2 border-t border-line px-4 py-3">
              <a
                href={item.src}
                download={item.filename}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm text-paper transition-opacity hover:opacity-90"
              >
                <DownloadIcon className="h-4 w-4" />
                {t.v_download}
              </a>
              <button
                onClick={copyCitation}
                title={t.v_copyCitation}
                className="rounded-lg border border-line-strong p-2 text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                {copied ? (
                  <span className="block h-4 w-4 text-center text-[12px] leading-4 text-[#3f6f5b]">✓</span>
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </button>
              {editable && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-lg border border-line-strong p-2 text-ink-soft hover:border-ink hover:text-ink"
                    title={t.v_edit}
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={remove}
                    disabled={busy}
                    className="rounded-lg border border-line-strong p-2 text-ink-soft hover:border-accent hover:text-accent disabled:opacity-50"
                    title={t.v_delete}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 划选后的「摘录」浮动按钮 */}
      {sel && !exForm && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setExForm({ quote: sel.text, note: "", tags: "", page: "" });
          }}
          style={{ position: "fixed", top: sel.top, left: sel.left, transform: "translate(-50%,-100%)" }}
          className="z-[60] rounded-full bg-accent px-3 py-1.5 text-xs text-white shadow-lg"
        >
          {t.ev_excerpt}
        </button>
      )}

      {/* 摘录表单 */}
      {exForm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setExForm(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line-strong bg-card p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 font-serif text-base text-ink">{t.ev_excerpt}</h3>
            <span className="mb-1 block text-xs text-muted">{t.ev_quote}</span>
            <textarea
              className="input mb-2 min-h-24 resize-y"
              value={exForm.quote}
              onChange={(e) => setExForm({ ...exForm, quote: e.target.value })}
            />
            <span className="mb-1 block text-xs text-muted">{t.ev_note}</span>
            <textarea
              className="input mb-2 min-h-16 resize-y"
              value={exForm.note}
              onChange={(e) => setExForm({ ...exForm, note: e.target.value })}
            />
            <div className="mb-3 flex gap-2">
              <input
                className="input flex-1"
                placeholder={t.ev_tags_ph}
                value={exForm.tags}
                onChange={(e) => setExForm({ ...exForm, tags: e.target.value })}
              />
              <input
                className="input w-28"
                placeholder={t.ev_page}
                value={exForm.page}
                onChange={(e) => setExForm({ ...exForm, page: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveExcerpt}
                disabled={busy || !exForm.quote.trim()}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {t.ev_save}
              </button>
              <button
                onClick={() => setExForm(null)}
                className="rounded-lg border border-line-strong px-3 py-2 text-sm text-ink-soft"
              >
                {t.ev_cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border: 1px solid var(--color-line-strong);
          background: var(--color-paper);
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 13px;
          color: var(--color-ink);
          outline: none;
        }
        .input:focus { border-color: var(--accent); }
        .doc-preview { color: var(--color-ink); }
        .doc-preview p { margin: 0 0 0.8em; line-height: 1.85; font-size: 14.5px; }
        .doc-preview h1, .doc-preview h2, .doc-preview h3 {
          font-family: var(--font-serif); margin: 1.1em 0 0.45em; line-height: 1.3; color: var(--color-ink);
        }
        .doc-preview h1 { font-size: 1.5em; }
        .doc-preview h2 { font-size: 1.25em; }
        .doc-preview h3 { font-size: 1.1em; }
        .doc-preview ul, .doc-preview ol { margin: 0 0 0.8em 1.4em; line-height: 1.8; }
        .doc-preview strong { font-weight: 600; }
        .doc-preview em { font-style: italic; }
        .doc-preview table { border-collapse: collapse; margin: 0.8em 0; width: 100%; font-size: 13px; }
        .doc-preview td, .doc-preview th { border: 1px solid var(--color-line); padding: 5px 8px; }
        .doc-preview img { max-width: 100%; height: auto; }
        .doc-preview a { color: var(--accent); text-decoration: underline; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0">{k}</dt>
      <dd className="truncate text-right text-ink-soft" title={v}>
        {v}
      </dd>
    </div>
  );
}
