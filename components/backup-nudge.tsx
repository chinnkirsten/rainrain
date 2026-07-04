"use client";

// 备份提醒：从未备份 / 距上次备份超过 7 天时，在首页顶部给一条温和提示。
// 时间戳由设置页「下载备份」按钮写入 localStorage（rr-last-backup）；可按周静音。
import { useEffect, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";

const WEEK = 7 * 24 * 3600 * 1000;

export function BackupNudge() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const snooze = Number(localStorage.getItem("rr-backup-snooze") || 0);
      if (Date.now() < snooze) return;
      const last = Number(localStorage.getItem("rr-last-backup") || 0);
      if (!last) setMsg(t.bk_never);
      else if (Date.now() - last > WEEK) setMsg(t.bk_old);
    } catch {}
  }, []);

  if (!msg) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm text-ink-soft">
      <span className="flex-1">{msg}</span>
      <Link href="/settings" className="rounded-full bg-ink px-3 py-1 text-xs text-paper hover:opacity-90">
        {t.bk_go}
      </Link>
      <button
        onClick={() => {
          try {
            localStorage.setItem("rr-backup-snooze", String(Date.now() + WEEK));
          } catch {}
          setMsg(null);
        }}
        className="text-xs text-muted hover:text-accent"
      >
        {t.bk_snooze}
      </button>
    </div>
  );
}
