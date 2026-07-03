"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookIcon } from "@/components/icons";
import { InkBranch } from "@/components/ink-branch";
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
      <InkBranch className="pointer-events-none absolute -right-10 -top-8 w-[min(78vw,480px)] select-none" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-paper">
            <BookIcon className="h-6 w-6" />
          </span>
          <h1 className="font-serif text-2xl">{t.brand}</h1>
          <p className="text-sm text-muted">{t.login_subtitle}</p>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-6 shadow-sm"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">{t.login_password}</span>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line-strong bg-paper px-3 py-2.5 text-ink outline-none focus:border-accent"
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
