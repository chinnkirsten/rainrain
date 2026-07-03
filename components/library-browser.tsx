"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemKind, PhaseId, ResearchItem } from "@/lib/types";
import { KIND_LABEL, KIND_ORDER } from "@/lib/ui";
import { t, nItems, LANG } from "@/lib/i18n";
import { toBibtex, toRis, toCsv } from "@/lib/cite";
import { ItemCard } from "./item-card";
import { ItemRow } from "./item-row";
import { ItemViewer } from "./item-viewer";
import { UploadPanel } from "./upload-panel";
import { DownloadIcon, SearchIcon, SettingsIcon, UploadIcon } from "./icons";

function downloadText(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type View = "grid" | "list";

/** 从文件名提取访谈编号（P01…），用于把录音与其转录稿关联起来 */
function interviewCode(name?: string): string | null {
  const m = /\bP\s*-?\s*0*(\d{1,3})/i.exec(name ?? "");
  return m ? `P${m[1].padStart(2, "0")}` : null;
}

type SortKey = "recent" | "year" | "title" | "size";
type Dir = "asc" | "desc";
type Density = "comfortable" | "compact";
const locale = LANG === "zh" ? "zh" : "en";
const DEFAULT_DIR: Record<SortKey, Dir> = {
  recent: "desc",
  year: "desc",
  title: "asc",
  size: "desc",
};
const ASC: Record<SortKey, (a: ResearchItem, b: ResearchItem) => number> = {
  recent: (a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
  year: (a, b) => (a.year ?? "").localeCompare(b.year ?? ""),
  title: (a, b) => a.title.localeCompare(b.title, locale),
  size: (a, b) => (a.size ?? 0) - (b.size ?? 0),
};
// 「待完善」只看可补全的标签——年代对档案扫描件常不可考，不算缺陷
const isIncomplete = (i: ResearchItem) => !(i.tags && i.tags.length > 0);

function recordRecent(item: ResearchItem) {
  try {
    const prev = JSON.parse(localStorage.getItem("lib:recent") || "[]");
    const entry = {
      id: item.id,
      title: item.title,
      phase: item.phase,
      kind: item.kind,
      src: item.src,
      cover: item.cover,
    };
    const next = [entry, ...prev.filter((x: { id: string }) => x.id !== item.id)].slice(0, 10);
    localStorage.setItem("lib:recent", JSON.stringify(next));
    window.dispatchEvent(new Event("lib:recent"));
  } catch {}
}

export function LibraryBrowser({ phase }: { phase?: PhaseId }) {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [blobConfigured, setBlobConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [kinds, setKinds] = useState<Set<ItemKind>>(new Set());
  const [tag, setTag] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [favOnly, setFavOnly] = useState(false);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");
  const [dir, setDir] = useState<Dir>("desc");
  const [density, setDensity] = useState<Density>("comfortable");
  const [view, setView] = useState<View>("grid");
  const [pinFav, setPinFav] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");

  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [contentMatches, setContentMatches] = useState<Map<string, { snippet: string; score: number }>>(new Map());
  const [showUpload, setShowUpload] = useState(false);
  const [active, setActive] = useState<ResearchItem | null>(null);
  const [manageTags, setManageTags] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);
  const scopeKey = `lib:f:${phase ?? "all"}`;

  // 载入持久化的偏好与该范围上次的筛选
  useEffect(() => {
    try {
      const g = JSON.parse(localStorage.getItem("lib:prefs") || "{}");
      if (g.density === "compact" || g.density === "comfortable") setDensity(g.density);
      if (g.view === "grid" || g.view === "list") setView(g.view);
      if (typeof g.pinFav === "boolean") setPinFav(g.pinFav);
      const f = JSON.parse(localStorage.getItem(scopeKey) || "{}");
      if (Array.isArray(f.kinds)) setKinds(new Set(f.kinds));
      if (typeof f.tag === "string") setTag(f.tag);
      if (typeof f.year === "string") setYear(f.year);
      if (typeof f.favOnly === "boolean") setFavOnly(f.favOnly);
      if (typeof f.incompleteOnly === "boolean") setIncompleteOnly(f.incompleteOnly);
      if (f.sort) setSort(f.sort);
      if (f.dir) setDir(f.dir);
    } catch {}
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存该范围的筛选
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(
        scopeKey,
        JSON.stringify({ kinds: [...kinds], tag, year, favOnly, incompleteOnly, sort, dir }),
      );
    } catch {}
  }, [kinds, tag, year, favOnly, incompleteOnly, sort, dir, scopeKey]);

  // 保存全局偏好
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem("lib:prefs", JSON.stringify({ density, view, pinFav }));
    } catch {}
  }, [density, view, pinFav]);

  // 全文搜索（归一化 + 相关度排序）：防抖请求服务端索引
  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 1) {
      setContentMatches(new Map());
      return;
    }
    const ctrl = new AbortController();
    const tm = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(needle)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => {
          const m = new Map<string, { snippet: string; score: number }>();
          (d.matches ?? []).forEach((x: { id: string; snippet: string; score: number }) =>
            m.set(x.id, { snippet: x.snippet, score: x.score }),
          );
          setContentMatches(m);
        })
        .catch(() => {});
    }, 260);
    return () => {
      clearTimeout(tm);
      ctrl.abort();
    };
  }, [q]);

  // 「/」聚焦搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tg = el?.tagName;
      if (tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT" || el?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const url = phase ? `/api/items?phase=${phase}` : "/api/items";
    Promise.all([
      fetch(url).then((r) => r.json()),
      fetch("/api/favorites").then((r) => r.json()).catch(() => ({ favorites: [] })),
    ])
      .then(([d, f]) => {
        if (!alive) return;
        setItems(d.items ?? []);
        setBlobConfigured(d.blobConfigured ?? false);
        setFavs(new Set<string>(f.favorites ?? []));
        // 深链：/library?item=<id> 直接打开该条目（笔记里的 [[史料]] 链接用）
        try {
          const want = new URLSearchParams(window.location.search).get("item");
          if (want) {
            const it = (d.items ?? []).find((x: ResearchItem) => x.id === want);
            if (it) {
              setActive(it);
              recordRecent(it);
            }
          }
        } catch {}
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [phase, reloadKey]);

  function openItem(item: ResearchItem) {
    setActive(item);
    recordRecent(item);
  }

  async function runBackup() {
    setBackingUp(true);
    setBackupMsg("");
    try {
      const r = await fetch("/api/backup", { method: "POST" });
      const d = await r.json();
      setBackupMsg(
        d.ok ? `${t.backup_done} ${d.file}（${(d.size / 1048576).toFixed(1)} MB）` : d.error ?? "",
      );
    } catch {
      setBackupMsg(t.up_failed);
    } finally {
      setBackingUp(false);
    }
  }

  function toggleFav(item: ResearchItem) {
    const value = !favs.has(item.id);
    setFavs((prev) => {
      const next = new Set(prev);
      value ? next.add(item.id) : next.delete(item.id);
      return next;
    });
    fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, value }),
    }).catch(() => {});
  }

  async function deleteFromCard(item: ResearchItem) {
    const msg =
      LANG === "zh"
        ? `把「${item.title}」移入回收站？之后可在回收站还原。`
        : `Move "${item.title}" to the recycle bin? You can restore it later.`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== item.id));
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Delete failed");
    }
  }

  // 上传后：先即时入列，再轮询拉取后台富化结果（PDF 封面）
  async function doRenameTag(tg: string) {
    const to = prompt(t.tags_renamePrompt.replace("%s", tg), tg);
    if (to === null) return;
    const nt = to.trim();
    if (nt === tg) return;
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "rename", from: tg, to: nt }),
    }).catch(() => {});
    if (tag === tg) setTag("");
    setReloadKey((k) => k + 1);
  }
  async function doDeleteTag(tg: string) {
    if (!confirm(t.tags_deleteConfirm.replace("%s", tg))) return;
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "delete", from: tg }),
    }).catch(() => {});
    if (tag === tg) setTag("");
    setReloadKey((k) => k + 1);
  }

  function handleUploaded(item: ResearchItem) {
    setItems((prev) => [item, ...prev]);
    if (blobConfigured || item.kind !== "pdf") return;
    let tries = 0;
    const poll = () => {
      tries++;
      fetch(`/api/items/${item.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.item?.cover) {
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...d.item } : i)));
            return;
          }
          if (tries < 6) setTimeout(poll, 3000);
        })
        .catch(() => {});
    };
    setTimeout(poll, 2500);
  }

  const availableKinds = useMemo(() => {
    const present = new Set(items.map((i) => i.kind));
    return KIND_ORDER.filter((k) => present.has(k));
  }, [items]);

  const availableYears = useMemo(() => {
    const ys = new Set(items.map((i) => i.year).filter(Boolean) as string[]);
    return [...ys].sort((a, b) => b.localeCompare(a));
  }, [items]);

  const incompleteCount = useMemo(() => items.filter(isIncomplete).length, [items]);

  const topTags = useMemo(() => {
    const count = new Map<string, number>();
    items.forEach((i) =>
      i.tags?.forEach((tg) => {
        if (/^JL\d+$/.test(tg)) return; // 访谈编号不进主题建议，保持主题整洁
        count.set(tg, (count.get(tg) ?? 0) + 1);
      }),
    );
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map((e) => e[0]);
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const mul = dir === "asc" ? 1 : -1;
    return items
      .filter((i) => (favOnly ? favs.has(i.id) : true))
      .filter((i) => (incompleteOnly ? isIncomplete(i) : true))
      .filter((i) => (kinds.size ? kinds.has(i.kind) : true))
      .filter((i) => (tag ? i.tags?.includes(tag) : true))
      .filter((i) => (year ? i.year === year : true))
      .filter((i) => {
        if (!needle) return true;
        const hay = [i.title, i.description, i.filename, i.year, ...(i.tags ?? [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle) || contentMatches.has(i.id);
      })
      .sort((a, b) => {
        // 收藏置顶（不受方向影响）
        if (pinFav) {
          const fa = favs.has(a.id);
          const fb = favs.has(b.id);
          if (fa !== fb) return fa ? -1 : 1;
        }
        if (needle) {
          // 搜索时按相关度排序
          const sa = contentMatches.get(a.id)?.score ?? 0;
          const sb = contentMatches.get(b.id)?.score ?? 0;
          if (sb !== sa) return sb - sa;
        } else {
          const c = ASC[sort](a, b) * mul;
          if (c !== 0) return c;
        }
        // 确定性次级键，杜绝抖动
        let c2 = a.title.localeCompare(b.title, locale);
        if (c2 === 0) c2 = a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        return c2;
      });
  }, [items, q, kinds, tag, year, favOnly, incompleteOnly, favs, sort, dir, pinFav, contentMatches]);

  const related = useMemo(() => {
    if (!active) return [];
    const code = interviewCode(active.filename);
    if (!code) return [];
    return items.filter((i) => i.id !== active.id && interviewCode(i.filename) === code);
  }, [active, items]);

  function toggleKind(k: ItemKind) {
    setKinds((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  function changeSort(s: SortKey) {
    setSort(s);
    setDir(DEFAULT_DIR[s]);
  }

  function navigate(delta: number) {
    if (!active) return;
    const idx = filtered.findIndex((i) => i.id === active.id);
    const ni = idx + delta;
    if (ni >= 0 && ni < filtered.length) openItem(filtered[ni]);
  }

  const activeIndex = active ? filtered.findIndex((i) => i.id === active.id) : -1;
  const hasFilters = q || kinds.size || tag || year || favOnly || incompleteOnly;
  const gridCls =
    density === "compact"
      ? "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6"
      : "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div className="flex flex-col gap-5">
      {/* 工具条 */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search_ph}
              className="w-full rounded-full border border-line-strong bg-card py-2.5 pl-9 pr-9 text-sm text-ink outline-none transition-colors focus:border-accent"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line-strong px-1.5 py-0.5 text-[10px] text-muted sm:block">
              /
            </kbd>
          </div>
          <button
            onClick={() => setShowUpload((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
          >
            <UploadIcon className="h-4 w-4" />
            {t.upload}
          </button>
        </div>

        {/* 筛选 */}
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
          <button
            onClick={() => setFavOnly((v) => !v)}
            className={`rounded-full border px-3 py-1 transition-colors ${
              favOnly
                ? "border-accent bg-accent text-white"
                : "border-line-strong text-ink-soft hover:border-accent hover:text-accent"
            }`}
          >
            {t.filter_fav}
          </button>
          <button
            onClick={() => setIncompleteOnly((v) => !v)}
            title={t.filter_incomplete}
            className={`rounded-full border px-3 py-1 tabular-nums transition-colors ${
              incompleteOnly
                ? "border-gold bg-gold text-white"
                : "border-line-strong text-ink-soft hover:border-gold hover:text-gold"
            }`}
          >
            {t.filter_incomplete} {incompleteCount}
          </button>
          {availableKinds.map((k) => (
            <button
              key={k}
              onClick={() => toggleKind(k)}
              className={`rounded-full border px-3 py-1 transition-colors ${
                kinds.has(k)
                  ? "border-ink bg-ink text-paper"
                  : "border-line-strong text-ink-soft hover:border-ink"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
          {availableYears.length > 0 && (
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="rounded-full border border-line-strong bg-card px-3 py-1 text-ink-soft outline-none focus:border-accent"
            >
              <option value="">{t.allYears}</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          {/* 排序 + 方向 + 视图设置（右对齐） */}
          <div className="ml-auto flex items-center gap-1.5">
            <select
              value={sort}
              onChange={(e) => changeSort(e.target.value as SortKey)}
              className="rounded-full border border-line-strong bg-card px-3 py-1 text-ink-soft outline-none focus:border-accent"
            >
              <option value="recent">{t.sort_recent}</option>
              <option value="year">{t.sort_year}</option>
              <option value="title">{t.sort_title}</option>
              <option value="size">{t.sort_size}</option>
            </select>
            <button
              onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
              title={t.dir_toggle}
              className="rounded-full border border-line-strong px-2 py-1 text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              {dir === "asc" ? "↑" : "↓"}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExport((v) => !v)}
                title={t.export_cite}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors ${
                  showExport
                    ? "border-accent text-accent"
                    : "border-line-strong text-ink-soft hover:border-accent hover:text-accent"
                }`}
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                {t.export_label}
              </button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowExport(false)} />
                  <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-line-strong bg-card p-2 shadow-lg">
                    <p className="px-1.5 pb-1.5 text-[11px] text-muted">
                      {t.export_cite}（{filtered.length}）
                    </p>
                    {([
                      ["BibTeX", () => downloadText("references.bib", toBibtex(filtered), "application/x-bibtex")],
                      ["RIS (Zotero/EndNote)", () => downloadText("references.ris", toRis(filtered), "application/x-research-info-systems")],
                      ["CSV", () => downloadText("library.csv", "﻿" + toCsv(filtered), "text/csv")],
                    ] as [string, () => void][]).map(([label, fn]) => (
                      <button
                        key={label}
                        onClick={() => {
                          fn();
                          setShowExport(false);
                        }}
                        className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-ink-soft hover:bg-paper-2"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSettings((v) => !v)}
                title={t.view_settings}
                className={`rounded-full border p-1.5 transition-colors ${
                  showSettings
                    ? "border-accent text-accent"
                    : "border-line-strong text-ink-soft hover:border-accent hover:text-accent"
                }`}
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
              {showSettings && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowSettings(false)} />
                  <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-line-strong bg-card p-3 shadow-lg">
                    <div className="mb-3">
                      <p className="mb-1.5 text-xs text-muted">{t.view_mode}</p>
                      <div className="flex gap-1 rounded-lg bg-paper-2 p-0.5">
                        {(["grid", "list"] as View[]).map((v) => (
                          <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`flex-1 rounded-md px-2 py-1 text-xs transition-colors ${
                              view === v ? "bg-card text-ink shadow-sm" : "text-muted"
                            }`}
                          >
                            {v === "grid" ? t.view_grid : t.view_list}
                          </button>
                        ))}
                      </div>
                    </div>
                    {view === "grid" && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-xs text-muted">{t.density}</p>
                        <div className="flex gap-1 rounded-lg bg-paper-2 p-0.5">
                          {(["comfortable", "compact"] as Density[]).map((d) => (
                            <button
                              key={d}
                              onClick={() => setDensity(d)}
                              className={`flex-1 rounded-md px-2 py-1 text-xs transition-colors ${
                                density === d ? "bg-card text-ink shadow-sm" : "text-muted"
                              }`}
                            >
                              {d === "comfortable" ? t.density_comfortable : t.density_compact}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center justify-between text-sm text-ink-soft">
                      {t.pin_fav}
                      <input
                        type="checkbox"
                        checked={pinFav}
                        onChange={(e) => setPinFav(e.target.checked)}
                        className="accent-[var(--accent)]"
                      />
                    </label>

                    <div className="mt-1 border-t border-line pt-2">
                      <p className="mb-1.5 text-[11px] text-muted">{t.backup_section}</p>
                      <button
                        onClick={runBackup}
                        disabled={backingUp}
                        className="w-full rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                      >
                        {backingUp ? t.backup_running : t.backup_now}
                      </button>
                      {backupMsg && (
                        <p className="mt-1.5 break-words text-[11px] leading-snug text-muted">{backupMsg}</p>
                      )}
                      <p className="mt-1.5 text-[10px] leading-snug text-muted">{t.backup_hint}</p>
                      <a
                        href="/trash"
                        className="mt-2 block rounded-lg px-3 py-1.5 text-center text-sm text-ink-soft transition-colors hover:bg-paper-2"
                      >
                        {t.nav_trash} →
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setQ("");
                setKinds(new Set());
                setTag("");
                setYear("");
                setFavOnly(false);
                setIncompleteOnly(false);
              }}
              className="rounded-full px-3 py-1 text-muted underline-offset-2 hover:text-accent hover:underline"
            >
              {t.clearFilters}
            </button>
          )}
        </div>

        {topTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">{t.topics}</span>
            {topTags.map((tg) =>
              manageTags ? (
                <span key={tg} className="inline-flex items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-soft">
                  <button onClick={() => doRenameTag(tg)} className="hover:text-accent" title={t.tags_manage}>#{tg}</button>
                  <button onClick={() => doDeleteTag(tg)} className="text-muted hover:text-rose-500" title="✕">✕</button>
                </span>
              ) : (
                <button
                  key={tg}
                  onClick={() => setTag(tag === tg ? "" : tg)}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                    tag === tg ? "bg-accent text-white" : "bg-paper-2 text-ink-soft hover:bg-line"
                  }`}
                >
                  #{tg}
                </button>
              ),
            )}
            <button
              onClick={() => setManageTags((v) => !v)}
              className="ml-1 rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-muted hover:border-accent hover:text-accent"
            >
              {manageTags ? t.tags_manageDone : "✎ " + t.tags_manage}
            </button>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadPanel
          defaultPhase={phase ?? "phd"}
          lockedPhase={!!phase}
          blobConfigured={blobConfigured}
          onUploaded={handleUploaded}
        />
      )}

      {/* Results */}
      <div className="text-xs text-muted">{loading ? t.loading : nItems(filtered.length)}</div>

      {!loading && filtered.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card/60 px-6 py-16 text-center">
          <p className="font-serif text-lg text-ink-soft">
            {hasFilters ? t.empty_title_filter : t.empty_title}
          </p>
          <p className="mt-1 text-sm text-muted">
            {hasFilters ? t.empty_desc_filter : t.empty_desc}
          </p>
        </div>
      ) : view === "list" ? (
        <div className="flex flex-col gap-1.5">
          {filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              showPhase={!phase}
              isFav={favs.has(item.id)}
              snippet={contentMatches.get(item.id)?.snippet}
              query={q.trim().length >= 2 ? q.trim() : undefined}
              onOpen={openItem}
              onToggleFav={toggleFav}
              onDelete={deleteFromCard}
            />
          ))}
        </div>
      ) : (
        <div className={gridCls}>
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              showPhase={!phase}
              isFav={favs.has(item.id)}
              snippet={contentMatches.get(item.id)?.snippet}
              query={q.trim().length >= 2 ? q.trim() : undefined}
              onOpen={openItem}
              onToggleFav={toggleFav}
              onDelete={deleteFromCard}
            />
          ))}
        </div>
      )}

      {active && (
        <ItemViewer
          item={active}
          hasPrev={activeIndex > 0}
          hasNext={activeIndex >= 0 && activeIndex < filtered.length - 1}
          onNavigate={navigate}
          related={related}
          onOpenRelated={openItem}
          onClose={() => setActive(null)}
          onChanged={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setActive(updated);
          }}
          onDeleted={(id) => {
            setItems((prev) => prev.filter((i) => i.id !== id));
            setActive(null);
          }}
        />
      )}
    </div>
  );
}
