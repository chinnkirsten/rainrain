"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { BrushRule, InkEmpty, InkLoading } from "@/components/ink-bits";
import { t, LANG } from "@/lib/i18n";
import type { LogEntry, LogKind } from "@/lib/types";
import { applyAnon } from "@/lib/anon-util";

const KIND: Record<LogKind, { label: string; color: string }> = {
  memo: { label: t.log_k_memo, color: "#2f6f9f" },
  decision: { label: t.log_k_decision, color: "#a5710f" },
  reflexivity: { label: t.log_k_reflexivity, color: "#6b4a9c" },
  auto: { label: t.log_k_auto, color: "#7a7a72" },
};
const ADDABLE: LogKind[] = ["memo", "decision", "reflexivity"];
const locale = LANG === "zh" ? "zh-CN" : "en-GB";
const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
};

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<LogKind>("memo");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [roMsg, setRoMsg] = useState(false);
  const [filter, setFilter] = useState<LogKind | "all">("all");

  function load() {
    return fetch("/api/log")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []));
  }
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function add() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setRoMsg(false);
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, body: text }),
      });
      if (res.ok) {
        setBody("");
        await load();
      } else {
        setRoMsg(true);
      }
    } catch {
      setRoMsg(true);
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm(t.log_delConfirm)) return;
    await fetch(`/api/log/${id}`, { method: "DELETE" }).catch(() => {});
    await load();
  }

  async function exportMd() {
    const rows = entries
      .map((e) => `**[${KIND[e.kind].label}]**  ${fmt(e.at)}\n\n${e.body}`)
      .join("\n\n---\n\n");
    const pairs = await fetch("/api/anon").then((r) => r.json()).then((d) => d.pairs ?? []).catch(() => []);
    download("research-log.md", applyAnon(`# ${t.log_title}\n\n${rows}\n`, pairs));
  }

  const shown = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.kind === filter)),
    [entries, filter],
  );

  const inp =
    "w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 pb-28">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-ink">{t.log_title}</h1>
            <BrushRule className="mt-1.5" />
            <p className="mt-1 max-w-2xl text-sm text-muted">{t.log_desc}</p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={exportMd}
              className="shrink-0 rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-ink-soft hover:border-accent hover:text-accent"
            >
              {t.log_export}
            </button>
          )}
        </div>

        {/* Composer */}
        <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-card p-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {ADDABLE.map((k) => {
              const on = kind === k;
              return (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className="rounded-full border px-3 py-1 text-xs transition-colors"
                  style={
                    on
                      ? { background: `${KIND[k].color}1a`, color: KIND[k].color, borderColor: KIND[k].color }
                      : { borderColor: "var(--line-strong, #ddd)", color: "var(--muted, #888)" }
                  }
                >
                  {KIND[k].label}
                </button>
              );
            })}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") add();
            }}
            placeholder={t.log_ph}
            className={`${inp} h-24 resize-y`}
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            {roMsg && <span className="text-xs text-muted">{t.resp_ro}</span>}
            <button
              onClick={add}
              disabled={busy || !body.trim()}
              className="rounded-full bg-accent px-4 py-1.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {t.log_add}
            </button>
          </div>
        </div>

        {/* Filter */}
        {entries.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {(["all", "memo", "decision", "reflexivity", "auto"] as const).map((k) => {
              const on = filter === k;
              const label = k === "all" ? t.log_filter_all : KIND[k].label;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    on ? "border-accent text-accent" : "border-line-strong text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Timeline */}
        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            <InkLoading />
          ) : shown.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-6 text-center text-sm text-muted">
              <InkEmpty hint={t.log_empty} />
            </div>
          ) : (
            shown.map((e) => (
              <div
                key={e.id}
                className="rounded-[var(--radius-card)] border border-line bg-card p-4"
                style={{ borderLeft: `3px solid ${KIND[e.kind].color}` }}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={{ background: `${KIND[e.kind].color}1a`, color: KIND[e.kind].color }}
                  >
                    {KIND[e.kind].label}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{fmt(e.at)}</span>
                  {e.kind !== "auto" && (
                    <button
                      onClick={() => del(e.id)}
                      className="ml-auto text-sm text-muted hover:text-red-600"
                      title={t.v_delete}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{e.body}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
