"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { t, LANG, switchLang } from "@/lib/i18n";
import { LogoutIcon, MoonIcon, SettingsIcon, SunIcon } from "./icons";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // 主导航固定 7 项；研究阶段不再占顶栏（在首页「研究历程」和「全部馆藏」里）。
  const NAV = [
    { href: "/", label: t.nav_home },
    { href: "/library", label: t.nav_all },
    { href: "/respondents", label: t.nav_respondents },
    { href: "/readings", label: t.nav_readings },
    { href: "/evidence", label: t.nav_evidence },
    { href: "/notes", label: t.nav_notes },
    { href: "/log", label: t.nav_log },
  ];
  const EXTRA = [
    { href: "/summary", label: t.nav_summary },
    { href: "/help", label: t.nav_help },
  ];

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  useEffect(() => {
    headerRef.current
      ?.querySelectorAll<HTMLElement>('[data-active="true"]')
      .forEach((el) => el.scrollIntoView({ inline: "center", block: "nearest" }));
  }, [pathname]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    // 0.4s 颜色过渡：只在切换瞬间挂上，避免常驻 transition 拖慢 hover
    const el = document.documentElement;
    el.classList.add("theme-anim");
    el.dataset.theme = next ? "dark" : "light";
    setTimeout(() => el.classList.remove("theme-anim"), 450);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const linkCls = (active: boolean) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
      active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-2 hover:text-ink"
    }`;

  return (
    <header ref={headerRef} className="no-print sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="flex shrink-0 items-center">
          <span className="font-serif text-[17px] leading-tight">{t.brand}</span>
        </Link>

        <nav className="no-scrollbar -mx-1 hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} data-active={isActive(n.href) ? "true" : undefined} className={linkCls(isActive(n.href))}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {EXTRA.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`hidden md:inline ${linkCls(isActive(n.href))}`}
            >
              {n.label}
            </Link>
          ))}
          <button
            onClick={() => switchLang()}
            className="rounded-full border border-line-strong px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
            title={LANG === "zh" ? "Switch to English" : "切换为中文"}
            aria-label={LANG === "zh" ? "Switch to English" : "切换为中文"}
          >
            {LANG === "zh" ? "EN" : "中"}
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-full border border-line-strong p-2 text-ink-soft transition-colors hover:border-accent hover:text-accent"
            title={t.theme_toggle}
            aria-label={t.theme_toggle}
          >
            {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
          <Link
            href="/settings"
            className="rounded-full border border-line-strong p-2 text-ink-soft transition-colors hover:border-accent hover:text-accent"
            title={t.nav_settings}
            aria-label={t.nav_settings}
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent"
            title={t.signout}
          >
            <LogoutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.signout}</span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
        {[...NAV, ...EXTRA].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            data-active={isActive(n.href) ? "true" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-[13px] ${isActive(n.href) ? "bg-ink text-paper" : "text-ink-soft"}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
