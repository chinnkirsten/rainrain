"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";

type Hit = { id: string; title: string; sub?: string; href: string };
type GroupKey = "items" | "readings" | "notes" | "evidence" | "respondents" | "log";
type Group = { key: GroupKey; hits: Hit[] };

const GROUP_LABEL: Record<GroupKey, string> = {
  items: t.nav_all,
  readings: t.nav_readings,
  notes: t.nav_notes,
  evidence: t.nav_evidence,
  respondents: t.nav_respondents,
  log: t.nav_log,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 全局快捷键：⌘/Ctrl+K 开关，Esc 关闭
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      setQ("");
      setGroups([]);
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // 防抖搜索
  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const tm = setTimeout(() => {
      fetch(`/api/palette?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          setGroups(d.groups ?? []);
          setActive(0);
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(tm);
  }, [q, open]);

  const flatHits = groups.flatMap((g) => g.hits);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flatHits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flatHits[active];
      if (hit) go(hit.href);
    }
  }

  if (!open) return null;

  let idx = -1;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto mt-[12vh] w-full max-w-xl rounded-2xl border border-line bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t.pal_ph}
          className="w-full border-0 bg-transparent px-4 py-3.5 text-ink outline-none placeholder:text-muted"
        />
        <div className="max-h-[60vh] overflow-y-auto border-t border-line">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted">…</div>
          ) : q.trim().length >= 2 && flatHits.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">{t.pal_none}</div>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="py-1.5">
                <div className="px-4 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                  {GROUP_LABEL[g.key]}
                </div>
                {g.hits.map((hit) => {
                  idx++;
                  const i = idx;
                  return (
                    <button
                      key={hit.id}
                      onClick={() => go(hit.href)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full flex-col items-start px-4 py-2 text-left ${
                        active === i ? "bg-paper-2" : ""
                      }`}
                    >
                      <span className="truncate text-sm text-ink">{hit.title}</span>
                      {hit.sub ? (
                        <span className="truncate text-xs text-muted">{hit.sub}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-line px-4 py-2 text-[11px] text-muted">{t.pal_hint}</div>
      </div>
    </div>
  );
}
