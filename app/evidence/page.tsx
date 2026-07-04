"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Highlight } from "@/components/highlight";
import { useStructure } from "@/components/structure-provider";
import { BrushRule, InkEmpty, InkLoading } from "@/components/ink-bits";
import { KIND_LABEL } from "@/lib/ui";
import { t, LANG } from "@/lib/i18n";
import type { Excerpt } from "@/lib/types";
import { applyAnon } from "@/lib/anon-util";

const cite = (e: Excerpt) =>
  LANG === "zh"
    ? `《${e.itemTitle}》${e.year ? `（${e.year}）` : ""}${e.page ? `，第${e.page}页` : ""}`
    : `“${e.itemTitle}”${e.year ? ` (${e.year})` : ""}${e.page ? `, p.${e.page}` : ""}`;

const interviewCode = (name?: string): string | null => {
  const m = /\bP\s*-?\s*0*(\d{1,3})/i.exec(name ?? "");
  return m ? `P${m[1].padStart(2, "0")}` : null;
};

export default function EvidencePage() {
  const [all, setAll] = useState<Excerpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"list" | "themes" | "matrix">("list");
  const [selCell, setSelCell] = useState<{ c: string; th: string } | null>(null);
  const [scope, setScope] = useState("");
  const { phases, map: phaseMap } = useStructure();

  const scoped = useMemo(() => (scope ? all.filter((e) => e.phase === scope) : all), [all, scope]);

  // 编码本定义/层级（storage/codebook.json）
  const [defs, setDefs] = useState<{ tag: string; definition?: string; parent?: string }[]>([]);
  const [openTag, setOpenTag] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/evidence")
      .then((r) => r.json())
      .then((d) => setAll(d.evidence ?? []))
      .finally(() => setLoading(false));
    fetch("/api/codebook")
      .then((r) => r.json())
      .then((d) => setDefs(d.defs ?? []))
      .catch(() => {});
  }, []);

  const defMap = useMemo(() => new Map(defs.map((d) => [d.tag, d])), [defs]);

  async function saveDef(tg: string, patch: { definition?: string; parent?: string }) {
    const cur = defMap.get(tg) ?? { tag: tg };
    const nd: { tag: string; definition?: string; parent?: string } = { ...cur, ...patch };
    if (!nd.definition?.trim()) delete nd.definition;
    if (!nd.parent) delete nd.parent;
    const next = [...defs.filter((d) => d.tag !== tg), ...(nd.definition || nd.parent ? [nd] : [])];
    setDefs(next);
    await fetch("/api/codebook", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defs: next }),
    }).catch(() => {});
  }

  const tags = useMemo(() => {
    const c = new Map<string, number>();
    scoped.forEach((e) => e.tags?.forEach((tg) => c.set(tg, (c.get(tg) ?? 0) + 1)));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  }, [scoped]);

  // 主题编码本：按标签聚合证据频次 + 跨源/跨受访者计数
  const codebook = useMemo(() => {
    const m = new Map<string, { count: number; sources: Set<string>; resp: Set<string> }>();
    scoped.forEach((e) => {
      const code = interviewCode(e.itemTitle);
      (e.tags ?? []).forEach((tg) => {
        const o = m.get(tg) ?? { count: 0, sources: new Set<string>(), resp: new Set<string>() };
        o.count++;
        o.sources.add(e.itemTitle);
        if (code) o.resp.add(code);
        m.set(tg, o);
      });
    });
    return [...m.entries()]
      .map(([t2, o]) => ({ tag: t2, count: o.count, sources: o.sources.size, resp: o.resp.size }))
      .sort((a, b) => b.count - a.count);
  }, [scoped]);
  const cbMax = codebook[0]?.count ?? 1;

  // 层级展示：子码缩进挂在父码下（一级层级够用；ponytail: 深层级等真实需要再说）
  const cbRows = useMemo(() => {
    const byTag = new Map(codebook.map((r) => [r.tag, r]));
    const kids = new Map<string, string[]>();
    const tops: string[] = [];
    codebook.forEach((r) => {
      const p = defMap.get(r.tag)?.parent;
      if (p && p !== r.tag && byTag.has(p)) kids.set(p, [...(kids.get(p) ?? []), r.tag]);
      else tops.push(r.tag);
    });
    const out: { row: (typeof codebook)[number]; depth: number }[] = [];
    tops.forEach((tg) => {
      out.push({ row: byTag.get(tg)!, depth: 0 });
      (kids.get(tg) ?? []).forEach((k) => out.push({ row: byTag.get(k)!, depth: 1 }));
    });
    return out;
  }, [codebook, defMap]);

  // 共现矩阵：前 8 个码两两同摘录计数（对角线 = 自身频次）
  const cooc = useMemo(() => {
    const top = codebook.slice(0, 8).map((r) => r.tag);
    const idx = new Map(top.map((tg, i) => [tg, i]));
    const m = Array.from({ length: top.length }, () => new Array<number>(top.length).fill(0));
    scoped.forEach((e) => {
      const ts = (e.tags ?? []).filter((tg) => idx.has(tg));
      ts.forEach((a) => ts.forEach((b) => m[idx.get(a)!][idx.get(b)!]++));
    });
    let max = 1;
    m.forEach((row, i) => row.forEach((v, j) => { if (i !== j && v > max) max = v; }));
    return { top, m, max };
  }, [scoped, codebook]);

  // 框架矩阵：案例（受访者 P0x）× 主题（编码），单元格 = 命中的证据片段
  const matrix = useMemo(() => {
    const cellMap = new Map<string, Excerpt[]>();
    const caseSet = new Set<string>();
    const themeSet = new Set<string>();
    let noCase = 0;
    scoped.forEach((e) => {
      const c = interviewCode(e.itemTitle);
      if (!c) {
        if (e.tags?.length) noCase++;
        return;
      }
      caseSet.add(c);
      (e.tags ?? []).forEach((th) => {
        themeSet.add(th);
        const k = `${c}||${th}`;
        const arr = cellMap.get(k) ?? [];
        arr.push(e);
        cellMap.set(k, arr);
      });
    });
    const order = new Map(codebook.map((r, i) => [r.tag, i] as const));
    const cases = [...caseSet].sort();
    const themes = [...themeSet].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
    return { cases, themes, cellMap, noCase };
  }, [scoped, codebook]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scoped
      .filter((e) => (tag ? e.tags?.includes(tag) : true))
      .filter((e) =>
        !needle
          ? true
          : [e.quote, e.note, e.itemTitle, ...(e.tags ?? [])]
              .join(" ")
              .toLowerCase()
              .includes(needle),
      );
  }, [scoped, q, tag]);

  async function remove(id: string) {
    if (!confirm(t.ev_confirmDel)) return;
    await fetch(`/api/evidence/${id}`, { method: "DELETE" }).catch(() => {});
    setAll((p) => p.filter((e) => e.id !== id));
  }

  // 写作出口：按主题分组导出 Word（.doc = HTML，Word/WPS 直接打开），自动应用匿名化
  async function exportDoc() {
    const pairs = await fetch("/api/anon").then((r) => r.json()).then((d) => d.pairs ?? []).catch(() => []);
    const A = (s: string) => applyAnon(s, pairs);
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const groups = new Map<string, Excerpt[]>();
    filtered.forEach((e) => (e.tags?.length ? e.tags : ["—"]).forEach((tg) => groups.set(tg, [...(groups.get(tg) ?? []), e])));
    const secs = [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([tg, es]) => {
        const def = defMap.get(tg)?.definition;
        return (
          `<h2>#${esc(A(tg))}（${es.length}）</h2>` +
          (def ? `<p style="color:#666;margin:0 0 6pt">${esc(A(def))}</p>` : "") +
          es
            .map(
              (e) =>
                `<blockquote>${esc(A(e.quote))}</blockquote><p class="src">— ${esc(A(cite(e)))}${e.note ? ` · ${esc(A(e.note))}` : ""}</p>`,
            )
            .join("")
        );
      })
      .join("");
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:"Times New Roman","Songti SC",serif;line-height:1.7;font-size:12pt}h1{font-size:16pt}h2{font-size:13pt;margin:14pt 0 4pt}blockquote{margin:0 0 2pt 18pt}p.src{margin:0 0 8pt 18pt;color:#555;font-size:10pt}</style></head><body><h1>${esc(t.ev_title)}</h1>${secs}</body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "evidence-by-theme.doc";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportList() {
    const md = filtered
      .map((e) => {
        const note = e.note ? `\n  ${t.ev_note}: ${e.note}` : "";
        const tg = e.tags?.length ? `  [${e.tags.map((x) => `#${x}`).join(" ")}]` : "";
        return `> ${e.quote}\n— ${cite(e)}${tg}${note}`;
      })
      .join("\n\n");
    const pairs = await fetch("/api/anon").then((r) => r.json()).then((d) => d.pairs ?? []).catch(() => []);
    await navigator.clipboard.writeText(applyAnon(md, pairs));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 pb-20">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-ink">{t.ev_title}</h1>
            <BrushRule className="mt-1.5" />
            <p className="mt-1 text-sm text-muted">{t.ev_desc}</p>
          </div>
          {filtered.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={exportDoc}
                className="rounded-full border border-line-strong px-4 py-2 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent"
              >
                {t.ev_exportDoc}
              </button>
              <button
                onClick={exportList}
                className="rounded-full bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90"
              >
                {copied ? t.ev_copied : `${t.ev_export} (${filtered.length})`}
              </button>
            </div>
          )}
        </header>

        {/* 视图切换 + 子课题筛选 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-line-strong bg-card p-0.5 text-sm">
            {(["list", "themes", "matrix"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-3.5 py-1 transition-colors ${
                  view === v ? "bg-accent text-white" : "text-ink-soft hover:text-accent"
                }`}
              >
                {v === "list" ? t.ev_view_list : v === "themes" ? t.ev_view_themes : t.ev_view_matrix}
              </button>
            ))}
          </div>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="rounded-full border border-line-strong bg-card px-3 py-1.5 text-sm text-ink-soft outline-none focus:border-accent"
          >
            <option value="">{t.scope_all}</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.parent ? `· ${p.title}` : p.title}</option>
            ))}
          </select>
        </div>

        {view === "themes" ? (
          <section>
            <p className="mb-3 text-sm text-muted">{t.ev_cb_desc}</p>
            {codebook.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card/60 px-6 py-14 text-center font-serif text-ink-soft">
                {loading ? <InkLoading /> : <InkEmpty hint={t.ev_cb_none} />}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-paper-2 text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{t.ev_cb_theme}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.ev_cb_count}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.ev_cb_sources}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.ev_cb_resp}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cbRows.map(({ row, depth }) => (
                      <FragmentRow
                        key={row.tag}
                        row={row}
                        depth={depth}
                        cbMax={cbMax}
                        def={defMap.get(row.tag)}
                        open={openTag === row.tag}
                        allTags={codebook.map((r) => r.tag)}
                        onOpen={() => setOpenTag(openTag === row.tag ? null : row.tag)}
                        onGoto={() => { setTag(row.tag); setView("list"); }}
                        onSave={(patch) => saveDef(row.tag, patch)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 共现矩阵 */}
            {cooc.top.length >= 2 && (
              <div className="mt-6">
                <h2 className="rr-sec font-serif text-lg text-ink">{t.cb_cooc}</h2>
                <p className="mb-3 mt-1 text-xs text-muted">{t.cb_cooc_desc}</p>
                <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
                  <table className="w-full text-xs">
                    <thead className="bg-paper-2 text-muted">
                      <tr>
                        <th className="px-2 py-1.5" />
                        {cooc.top.map((tg) => (
                          <th key={tg} className="max-w-16 truncate px-2 py-1.5 text-left font-medium" title={tg}>#{tg}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cooc.top.map((tg, i) => (
                        <tr key={tg} className="border-t border-line">
                          <td className="max-w-24 truncate px-2 py-1.5 text-muted" title={tg}>#{tg}</td>
                          {cooc.top.map((tg2, j) => (
                            <td
                              key={tg2}
                              className={`px-2 py-1.5 tabular-nums ${i === j ? "text-muted" : "text-ink"}`}
                              style={
                                i !== j && cooc.m[i][j] > 0
                                  ? { background: `color-mix(in srgb, var(--accent) ${Math.round((cooc.m[i][j] / cooc.max) * 32)}%, transparent)` }
                                  : undefined
                              }
                            >
                              {cooc.m[i][j] || (i === j ? cooc.m[i][j] : "·")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        ) : view === "matrix" ? (
          <section>
            <p className="mb-3 text-sm text-muted">{t.ev_matrix_desc}</p>
            {matrix.cases.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card/60 px-6 py-14 text-center font-serif text-ink-soft">
                {loading ? <InkLoading /> : <InkEmpty hint={t.ev_matrix_none} />}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
                  <table className="min-w-full text-sm">
                    <thead className="bg-paper-2 text-xs text-muted">
                      <tr>
                        <th className="sticky left-0 z-10 bg-paper-2 px-3 py-2 text-left font-medium">{t.ev_matrix_case}</th>
                        {matrix.themes.map((th) => (
                          <th key={th} className="whitespace-nowrap px-2 py-2 text-center font-medium">#{th}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.cases.map((c) => (
                        <tr key={c} className="border-t border-line">
                          <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-2 font-medium">
                            <a href={`/case/${c}`} className="text-ink hover:text-accent">{c}</a>
                          </td>
                          {matrix.themes.map((th) => {
                            const arr = matrix.cellMap.get(`${c}||${th}`) ?? [];
                            const on = selCell?.c === c && selCell?.th === th;
                            return (
                              <td key={th} className="border-l border-line/60 p-0 text-center">
                                {arr.length ? (
                                  <button
                                    onClick={() => setSelCell(on ? null : { c, th })}
                                    className={`h-9 w-full min-w-[2.5rem] text-xs ${on ? "bg-accent text-white" : "text-ink hover:brightness-95"}`}
                                    style={on ? undefined : { backgroundColor: `rgba(124,45,45,${Math.min(0.4, 0.1 + arr.length * 0.09)})` }}
                                  >
                                    {arr.length}
                                  </button>
                                ) : (
                                  <span className="block h-9 leading-9 text-line-strong">·</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {matrix.noCase > 0 && (
                  <p className="mt-2 text-xs text-muted">{t.ev_matrix_nocase.replace("%s", String(matrix.noCase))}</p>
                )}
                {selCell && (
                  <div className="mt-4 rounded-[var(--radius-card)] border border-line bg-card p-4">
                    <div className="mb-2 text-sm">
                      <span className="font-medium text-ink">{selCell.c}</span>
                      <span className="text-muted"> · #{selCell.th} · {(matrix.cellMap.get(`${selCell.c}||${selCell.th}`) ?? []).length}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {(matrix.cellMap.get(`${selCell.c}||${selCell.th}`) ?? []).map((e) => (
                        <blockquote key={e.id} className="border-l-2 border-accent/60 pl-3 font-serif text-[15px] leading-relaxed text-ink">
                          {e.quote}
                          <span className="mt-1 block text-xs text-muted">{cite(e)}</span>
                        </blockquote>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
        <>
        <div className="mb-4 flex flex-col gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.ev_search}
            className="w-full max-w-md rounded-full border border-line-strong bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">{t.topics}</span>
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
          )}
        </div>

        <div className="mb-2 text-xs text-muted">
          {loading ? t.loading : `${filtered.length} ${t.unit_excerpts}`}
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card/60 px-6 py-16 text-center">
            <InkEmpty hint={t.ev_none} />
            <p className="mt-1 text-sm text-muted">{t.ev_emptyHint}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((e) => {
              const phase = phaseMap[e.phase];
              return (
                <article
                  key={e.id}
                  className="rounded-[var(--radius-card)] border border-line bg-card p-4"
                >
                  <blockquote className="border-l-2 pl-3 font-serif text-[15px] leading-relaxed text-ink" style={{ borderColor: phase?.accent }}>
                    <Highlight text={e.quote} q={q.trim()} />
                  </blockquote>
                  {e.note && (
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                      <span className="text-muted">{t.ev_note}: </span>
                      <Highlight text={e.note} q={q.trim()} />
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px]"
                      style={{ color: phase?.accent, backgroundColor: `${phase?.accent ?? "#777"}14` }}
                    >
                      {KIND_LABEL[e.itemKind]}
                    </span>
                    <span className="text-ink-soft">{cite(e)}</span>
                    {e.tags?.map((tg) => (
                      <button
                        key={tg}
                        onClick={() => setTag(tg)}
                        className="rounded bg-paper-2 px-1.5 py-0.5 hover:bg-line"
                      >
                        #{tg}
                      </button>
                    ))}
                    <button
                      onClick={() => remove(e.id)}
                      className="ml-auto text-muted hover:text-accent"
                    >
                      {t.v_delete}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        </>
        )}
      </main>
    </>
  );
}

// 编码本行：主行 + 展开的「定义 / 父级」编辑（保存即写 storage/codebook.json）
function FragmentRow({ row, depth, cbMax, def, open, allTags, onOpen, onGoto, onSave }: {
  row: { tag: string; count: number; sources: number; resp: number };
  depth: number;
  cbMax: number;
  def?: { definition?: string; parent?: string };
  open: boolean;
  allTags: string[];
  onOpen: () => void;
  onGoto: () => void;
  onSave: (patch: { definition?: string; parent?: string }) => void;
}) {
  return (
    <>
      <tr className="cursor-pointer border-t border-line hover:bg-paper-2">
        <td className="px-3 py-2" onClick={onGoto}>
          <span className="flex items-center gap-1 text-ink" style={{ paddingLeft: depth * 18 }}>
            {depth > 0 && <span className="text-muted">└</span>}
            #{row.tag}
            <button
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
              className="ml-1 rounded px-1 text-xs text-muted hover:text-accent"
              title={t.cb_def}
            >
              ✎
            </button>
          </span>
          {def?.definition && !open && (
            <span className="mt-0.5 block max-w-md truncate text-xs text-muted" style={{ paddingLeft: depth * 18 }}>
              {def.definition}
            </span>
          )}
          <span
            className="mt-1 block h-1 rounded-full bg-accent/70"
            style={{ width: `${Math.max(6, (row.count / cbMax) * 100)}%`, marginLeft: depth * 18 }}
          />
        </td>
        <td className="px-3 py-2 text-right font-medium text-ink" onClick={onGoto}>{row.count}</td>
        <td className="px-3 py-2 text-right text-ink-soft" onClick={onGoto}>{row.sources}</td>
        <td className="px-3 py-2 text-right text-ink-soft" onClick={onGoto}>{row.resp || "—"}</td>
      </tr>
      {open && (
        <tr className="border-t border-line bg-paper-2/50">
          <td colSpan={4} className="px-3 py-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted">{t.cb_def}</label>
              <textarea
                defaultValue={def?.definition ?? ""}
                onBlur={(e) => onSave({ definition: e.target.value })}
                placeholder={t.cb_defPh}
                className="h-16 w-full resize-none rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
              />
              <label className="flex items-center gap-2 text-xs text-muted">
                {t.cb_parent}
                <select
                  value={def?.parent ?? ""}
                  onChange={(e) => onSave({ parent: e.target.value })}
                  className="rounded border border-line-strong bg-paper px-2 py-1 text-xs text-ink-soft outline-none focus:border-accent"
                >
                  <option value="">{t.cb_top}</option>
                  {allTags.filter((tg) => tg !== row.tag).map((tg) => (
                    <option key={tg} value={tg}>#{tg}</option>
                  ))}
                </select>
              </label>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
