"use client";

import { useEffect, useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/site-header";
import { BrushRule } from "@/components/ink-bits";
import { t } from "@/lib/i18n";
import type { AnonPair } from "@/lib/anon-util";
import { DEFAULT_PREFS, getPrefs, savePrefs, type Prefs } from "@/lib/prefs";

const inputCls =
  "rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent";

export default function SettingsPage() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // 恢复
  const [restoreMsg, setRestoreMsg] = useState("");
  const [restoring, setRestoring] = useState(false);

  // 匿名化映射
  const [pairs, setPairs] = useState<AnonPair[]>([]);
  const [anonMsg, setAnonMsg] = useState("");
  const [anonBusy, setAnonBusy] = useState(false);

  // 氛围偏好（localStorage，本机生效）
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => setPrefs(getPrefs()), []);
  const patchPrefs = (p: Partial<Prefs>) => setPrefs(savePrefs(p));

  // 资料库占用（本地模式才有）
  const [usage, setUsage] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => setUsage(typeof d.bytes === "number" ? d.bytes : null))
      .catch(() => {});
  }, []);
  const fmtBytes = (n: number) =>
    n > 1 << 30 ? `${(n / (1 << 30)).toFixed(1)} GB` : n > 1 << 20 ? `${(n / (1 << 20)).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

  useEffect(() => {
    fetch("/api/anon")
      .then((r) => r.json())
      .then((d) => setPairs((d.pairs as AnonPair[]) ?? []))
      .catch(() => {});
  }, []);

  async function change(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) {
      setMsg({ ok: false, text: t.set_pw_mismatch });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: cur, next }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: t.set_pw_changed });
        setCur("");
        setNext("");
        setConfirm("");
      } else {
        setMsg({ ok: false, text: d.error || "Failed" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function restore(file: File) {
    if (!window.confirm(t.set_backup_restoreConfirm)) return;
    setRestoring(true);
    setRestoreMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/backup/restore", { method: "POST", body: fd });
      const d = await res.json();
      setRestoreMsg(res.ok ? t.set_backup_restored : d.error || "Failed");
    } catch {
      setRestoreMsg("Failed");
    } finally {
      setRestoring(false);
    }
  }

  async function saveAnon() {
    setAnonBusy(true);
    setAnonMsg("");
    try {
      const clean = pairs.filter((p) => p.from.trim());
      const res = await fetch("/api/anon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs: clean }),
      });
      const d = await res.json();
      if (res.ok) {
        setPairs((d.pairs as AnonPair[]) ?? clean);
        setAnonMsg(t.struct_saved);
      } else {
        setAnonMsg(d.error || "Failed");
      }
    } finally {
      setAnonBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 pb-20">
        <h1 className="font-serif text-3xl text-ink">{t.set_title}</h1>
        <BrushRule className="mt-1.5" />

        {/* 界面偏好：字号 / 禅音（本机生效） */}
        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-card p-5">
          <h2 className="font-serif text-lg text-ink">{t.set_atmo}</h2>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-32 text-muted">{t.set_fontSize}</span>
              {([15, 16, 17] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => patchPrefs({ fontSize: v })}
                  className={`rounded-full px-3 py-1 text-xs tabular-nums transition-colors ${
                    prefs.fontSize === v ? "bg-accent text-white" : "bg-paper-2 text-ink-soft hover:bg-line"
                  }`}
                >
                  {v}px
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-3">
              <span className="w-32 text-muted">{t.set_atmo_sound}</span>
              <input
                type="checkbox"
                checked={prefs.sound}
                onChange={(e) => patchPrefs({ sound: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
              />
            </label>
          </div>
        </section>

        <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-card p-5">
          <h2 className="font-serif text-lg text-ink">{t.set_security}</h2>
          <p className="mt-1 text-sm text-muted">{t.set_security_desc}</p>
          <form onSubmit={change} className="mt-4 flex max-w-sm flex-col gap-3">
            <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder={t.set_pw_current} className={inputCls} autoComplete="current-password" />
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder={t.set_pw_new} className={inputCls} autoComplete="new-password" />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t.set_pw_confirm} className={inputCls} autoComplete="new-password" />
            <div className="flex items-center gap-3">
              <button disabled={busy || !cur || !next} className="rounded-full bg-accent px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                {t.set_pw_change}
              </button>
              {msg && <span className={`text-sm ${msg.ok ? "text-accent" : "text-red-600"}`}>{msg.text}</span>}
            </div>
          </form>
        </section>

        {/* 备份 / 恢复 */}
        <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-card p-5">
          <h2 className="font-serif text-lg text-ink">{t.set_backup}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t.set_backup_desc}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href="/api/backup"
              onClick={() => {
                try {
                  localStorage.setItem("rr-last-backup", String(Date.now()));
                } catch {}
              }}
              className="rounded-full bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90"
            >
              {t.set_backup_download}
            </a>
            {usage != null && (
              <span className="text-xs text-muted">
                {t.set_usage}: {fmtBytes(usage)}
              </span>
            )}
            <label className="cursor-pointer rounded-full border border-line-strong px-4 py-2 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent">
              {restoring ? t.set_backup_restoring : t.set_backup_restore}
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) restore(f);
                  e.target.value = "";
                }}
              />
            </label>
            {restoreMsg && <span className="text-sm text-muted">{restoreMsg}</span>}
          </div>
        </section>

        {/* 匿名化映射 */}
        <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-card p-5">
          <h2 className="font-serif text-lg text-ink">{t.set_anon}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t.set_anon_desc}</p>
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2 text-xs text-muted">
              <span className="flex-1">{t.set_anon_from}</span>
              <span className="flex-1">{t.set_anon_to}</span>
              <span className="w-6" />
            </div>
            {pairs.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={p.from}
                  onChange={(e) => setPairs((ps) => ps.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))}
                  placeholder={t.set_anon_fromPh}
                  className={`${inputCls} flex-1`}
                />
                <input
                  value={p.to}
                  onChange={(e) => setPairs((ps) => ps.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))}
                  placeholder={t.set_anon_toPh}
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() => setPairs((ps) => ps.filter((_, j) => j !== i))}
                  className="w-6 text-sm text-muted hover:text-red-600"
                  title={t.v_delete}
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="mt-1 flex items-center gap-3">
              <button
                onClick={() => setPairs((ps) => [...ps, { from: "", to: "" }])}
                className="rounded-full border border-dashed border-line-strong px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
              >
                + {t.set_anon_add}
              </button>
              <button
                onClick={saveAnon}
                disabled={anonBusy}
                className="rounded-full bg-accent px-4 py-1.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {anonBusy ? t.struct_saving : t.struct_save}
              </button>
              {anonMsg && <span className="text-sm text-accent">{anonMsg}</span>}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-card p-5">
          <h2 className="font-serif text-lg text-ink">{t.set_privacy}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t.set_privacy_body}</p>
        </section>
      </main>
    </>
  );
}
