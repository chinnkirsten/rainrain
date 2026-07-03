import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { LANG, t } from "@/lib/i18n";
import { StructureProvider } from "@/components/structure-provider";
import { Sakura } from "@/components/sakura";

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
  const themeScript = `try{var s=localStorage.getItem('theme');if(s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.dataset.theme='dark';}}catch(e){}`;
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
      </body>
    </html>
  );
}
