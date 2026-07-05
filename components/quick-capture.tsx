"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/lib/i18n";

type Target = { id: string; title: string; type: string };
type Dest = "log" | "note";

const norm = (s: string) => s.trim().toLowerCase();

/** ⌘J 随手记：一个输入框，回车即存进研究日志（或切成笔记），支持 [[链接]] 联想。 */
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [dest, setDest] = useState<Dest>("log");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [ac, setAc] = useState({ open: false, query: "", start: 0, index: 0 });
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // 全局快捷键：⌘/Ctrl+J 开关，Esc 关闭
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
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
    if (!open) return;
    setBody("");
    setAc((a) => ({ ...a, open: false }));
    requestAnimationFrame(() => boxRef.current?.focus());
    // 联想目标惰性加载一次；失败不阻塞速记本身
    if (!targets.length)
      fetch("/api/link-targets")
        .then((r) => r.json())
        .then((d) => setTargets(d.targets ?? []))
        .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const caret = e.target.selectionStart ?? value.length;
    setBody(value);
    const before = value.slice(0, caret);
    const at = before.lastIndexOf("[[");
    if (at >= 0) {
      const between = before.slice(at + 2);
      if (!between.includes("]") && !between.includes("[") && !between.includes("\n")) {
        setAc({ open: true, query: between, start: at, index: 0 });
        return;
      }
    }
    setAc((a) => (a.open ? { ...a, open: false } : a));
  }

  const acMatches = useMemo(() => {
    if (!ac.open) return [];
    const nq = norm(ac.query);
    const pool = nq ? targets.filter((tg) => norm(tg.title).includes(nq)) : targets;
    return pool.slice(0, 6);
  }, [ac, targets]);

  function applyAc(title: string) {
    const end = ac.start + 2 + ac.query.length;
    const next = body.slice(0, ac.start) + `[[${title}]]` + body.slice(end);
    const pos = ac.start + title.length + 4;
    setBody(next);
    setAc((a) => ({ ...a, open: false }));
    requestAnimationFrame(() => {
      const el = boxRef.current;
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    });
  }

  async function save() {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      if (dest === "log") {
        const r = await fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "memo", body: text }),
        });
        if (!r.ok) throw new Error();
      } else {
        // 首行当标题，其余是正文；只有一行就整条当标题
        const nl = text.indexOf("\n");
        const title = (nl === -1 ? text : text.slice(0, nl)).trim().slice(0, 120);
        const rest = nl === -1 ? "" : text.slice(nl + 1).trim();
        const r = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body: rest }),
        });
        if (!r.ok) throw new Error();
      }
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
      setOpen(false);
    } catch {
      // 只读演示环境或断连：保住用户的字，不关窗
      alert(t.qc_failed);
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (ac.open && acMatches.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setAc((a) => ({ ...a, index: Math.min(a.index + 1, acMatches.length - 1) })); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setAc((a) => ({ ...a, index: Math.max(a.index - 1, 0) })); return; }
      if (e.key === "Enter") { e.preventDefault(); applyAc(acMatches[ac.index].title); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  }

  if (!open)
    return flash ? (
      <div className="fixed bottom-6 right-6 z-[95] rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink shadow-lg">
        {t.qc_saved}
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
      <div
        className="mx-auto mt-[16vh] w-full max-w-xl rounded-2xl border border-line bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <textarea
            ref={boxRef}
            value={body}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={t.qc_ph}
            rows={4}
            className="w-full resize-none border-0 bg-transparent px-4 py-3.5 text-ink outline-none placeholder:text-muted"
          />
          {ac.open && acMatches.length > 0 && (
            <div className="absolute left-4 top-full z-10 -mt-1 w-72 overflow-hidden rounded-lg border border-line bg-card shadow-lg">
              {acMatches.map((m, i) => (
                <button
                  key={`${m.type}-${m.id}`}
                  onClick={() => applyAc(m.title)}
                  onMouseEnter={() => setAc((a) => ({ ...a, index: i }))}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${ac.index === i ? "bg-paper-2" : ""}`}
                >
                  <span className="truncate text-ink">{m.title}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-muted">{m.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-sm">
          <span className="text-muted">{t.qc_dest}</span>
          <button
            onClick={() => setDest("log")}
            className={dest === "log" ? "font-medium text-ink" : "text-muted"}
          >
            {t.nav_log}
          </button>
          <button
            onClick={() => setDest("note")}
            className={dest === "note" ? "font-medium text-ink" : "text-muted"}
          >
            {t.nav_notes}
          </button>
          <button
            onClick={save}
            disabled={saving || !body.trim()}
            className="ml-auto rounded-lg border border-line px-3 py-1 text-ink disabled:opacity-40"
          >
            {saving ? "…" : t.qc_save}
          </button>
        </div>
        <div className="border-t border-line px-4 py-2 text-[11px] text-muted">{t.qc_hint}</div>
      </div>
    </div>
  );
}
