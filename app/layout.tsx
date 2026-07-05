import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import Script from "next/script";
import { cookies } from "next/headers";
import "./globals.css";
import { t, langFrom } from "@/lib/i18n";
import { StructureProvider } from "@/components/structure-provider";
import { LangProvider } from "@/components/lang-provider";
import { ZenChime } from "@/components/zen-chime";
import { CommandPalette } from "@/components/command-palette";
import { QuickCapture } from "@/components/quick-capture";

const display = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: t.brand,
  description: t.home_subtitle,
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // 运行时语言：读 rr-lang cookie（切换按钮写入后整页刷新）
  const lang = langFrom((await cookies()).get("rr-lang")?.value);
  // 主题 + 字号偏好：首帧前应用，避免闪烁（字号走 html font-size，rem 全局缩放）
  const themeScript = `try{var s=localStorage.getItem('theme');if(s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.dataset.theme='dark';}var p=JSON.parse(localStorage.getItem('rr-prefs')||'{}');if(p.fontSize)document.documentElement.style.fontSize=p.fontSize+'px';}catch(e){}`;
  return (
    <html
      lang={lang === "zh" ? "zh-CN" : "en"}
      className={`${display.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="paper-grain min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <StructureProvider>
          <LangProvider>{children}</LangProvider>
        </StructureProvider>
        <CommandPalette />
        <QuickCapture />
        <ZenChime />
      </body>
    </html>
  );
}
