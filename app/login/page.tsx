"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookIcon } from "@/components/icons";
import { InkPainting } from "@/components/ink-painting";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.err_login);
      const from = new URLSearchParams(window.location.search).get("from");
      router.push(from && from.startsWith("/") ? from : "/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="paper-grain relative flex min-h-screen items-center justify-center overflow-hidden px-5">
      {/* 整幅水墨樱梅，铺满入口 */}
      <InkPainting variant="entrance" className="pointer-events-none absolute inset-0 h-full w-full select-none" />

      {/* 竖排题字 */}
      <div
        aria-hidden
        className="rr-vertical pointer-events-none absolute left-7 top-1/2 hidden -translate-y-1/2 select-none items-center gap-4 font-serif text-[15px] tracking-[0.55em] text-ink-soft/75 md:flex"
      >
        <span>格物致知</span>
        <span className="mt-1 inline-block h-2 w-2 rounded-[2px] bg-accent/80" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-paper shadow-[0_10px_24px_-10px_rgba(124,45,45,0.55)]">
            <BookIcon className="h-[22px] w-[22px]" />
          </span>
          <h1 className="font-serif text-4xl text-ink">{t.brand}</h1>
          <p className="font-serif text-[15px] italic leading-relaxed text-ink-soft">{t.login_poem}</p>
          <p className="text-xs text-muted">{t.login_subtitle}</p>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-card/85 p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)] backdrop-blur-md"
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
