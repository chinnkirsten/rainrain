"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InkPainting } from "@/components/ink-painting";
import { InkCat } from "@/components/ink-cat";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, remember }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.err_login);
      const from = new URLSearchParams(window.location.search).get("from");
      router.push(from && from.startsWith("/") ? from : "/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      // 错误反馈：卡片轻抖三下，枝头的猫甩一下尾巴
      setShake((v) => v + 1);
      setTimeout(() => setShake(0), 600);
      window.dispatchEvent(new CustomEvent("rr-cat-flick"));
    }
  }

  return (
    <main className="paper-grain relative flex min-h-screen justify-center overflow-hidden px-5">
      {/* 整幅水墨樱梅铺满入口；小黑猫同坐标系叠在枝头 */}
      <InkPainting variant="entrance" className="pointer-events-none absolute inset-0 h-full w-full select-none" />
      <InkCat />

      {/* 大字水印：淡墨「花」 */}
      <span aria-hidden className="rr-wm font-serif absolute left-[6%] top-1/2 hidden -translate-y-1/2 text-[240px] lg:block">
        花
      </span>

      {/* 竖排题字（书脊式 RainRain） */}
      <div
        aria-hidden
        className="rr-vertical pointer-events-none absolute left-7 top-1/2 hidden -translate-y-1/2 select-none items-center gap-4 font-serif text-[15px] italic tracking-[0.35em] text-ink-soft/80 sm:flex"
      >
        <span>RainRain</span>
        <span className="mt-1 inline-block h-2 w-2 rounded-[2px] bg-accent/80" />
      </div>

      <div className="relative mt-[clamp(150px,24vh,300px)] w-full max-w-sm pb-16">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <h1 className="font-serif text-4xl leading-tight text-ink">{t.brand}</h1>
          <p className="font-serif text-[15px] italic leading-relaxed text-ink-soft">{t.login_poem}</p>
          <p className="text-xs text-muted">{t.login_subtitle}</p>
        </div>

        <form
          onSubmit={submit}
          className={`flex flex-col gap-3 rounded-2xl border border-line bg-card/85 p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)] backdrop-blur-md ${shake ? "rr-shake" : ""}`}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">{t.login_password}</span>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line-strong bg-paper/80 px-3 py-2.5 text-ink outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
            />
            {t.login_remember}
          </label>
          {error && <p className="text-sm text-accent">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="mt-1 rounded-lg bg-accent px-4 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? t.login_signingIn : t.login_enter}
          </button>
        </form>
      </div>
    </main>
  );
}
