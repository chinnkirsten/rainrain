"use client";

// 首页滚动视差：滚动时缓慢上移+微淡出（≤22px，transform-only）。
// 参考「风翻动书页」的滚动诗意；reduced-motion 下不动。
import { useEffect, useRef } from "react";

export function HeroParallax({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = Math.min(window.scrollY, 420);
        el.style.transform = `translateY(${(-y * 0.055).toFixed(1)}px)`;
        el.style.opacity = String(Math.max(0.25, 1 - y / 700));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
