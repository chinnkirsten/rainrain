"use client";

// 运行时语言的水合安全开关：首帧按构建默认语言渲染（与 SSR 完全一致，零水合错位），
// 挂载后读用户语言；不同则把模块 LANG 切过去并用 key 整树 remount —— 所有客户端
// 组件重新渲染即拿到新语言。默认语言用户零开销（effect 空转）。
import { useEffect, useState } from "react";
import { LANG, __applyClientLang, type Lang } from "@/lib/i18n";

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(LANG);
  useEffect(() => {
    const applied = __applyClientLang();
    if (applied !== lang) setLang(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div key={lang} className="contents">
      {children}
    </div>
  );
}
