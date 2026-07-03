import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { LANG, t } from "@/lib/i18n";
import { StructureProvider } from "@/components/structure-provider";
import { Sakura } from "@/components/sakura";
import { ZenChime } from "@/components/zen-chime";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // 主题 + 氛围偏好：首帧前应用，避免闪烁（字号走 html font-size，rem 全局缩放）
  const themeScript = `try{var s=localStorage.getItem('theme');if(s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.dataset.theme='dark';}var p=JSON.parse(localStorage.getItem('rr-prefs')||'{}');if(p.fontSize)document.documentElement.style.fontSize=p.fontSize+'px';if(p.entrance===false)document.documentElement.classList.add('rr-no-anim');if(p.cat===false)document.documentElement.classList.add('rr-no-cat');}catch(e){}`;
  return (
    <html
      lang={LANG === "zh" ? "zh-CN" : "en"}
      className={`${display.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="paper-grain min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <StructureProvider>{children}</StructureProvider>
        <Sakura />
        <ZenChime />
      </body>
    </html>
  );
}
