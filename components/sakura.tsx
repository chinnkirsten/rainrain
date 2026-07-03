"use client";

// 樱花瓣层：入场时花瓣片片飘落，点击处樱花散落。
// 纯装饰（pointer-events:none）；尊重 prefers-reduced-motion；
// 画布上没有花瓣时挂起 rAF —— 平时零常驻开销。
import { useEffect, useRef } from "react";

type Petal = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  term: number; // 终端下落速度
  drag: number; // 横向速度衰减（点击瓣大、入场瓣近乎 0 以保留风感）
  size: number;
  rot: number;
  vr: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  flutterFreq: number; // 翻转（绕自身轴）频率
  color: string;
  born: number; // 出场时刻（入场瓣用它错峰）
  life: number; // >0 按寿命渐隐；0 = 落出屏幕才消失
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function Sakura() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // 花瓣配色跟随主题（读 CSS 变量；切换主题时刷新）
    let palette = ["#f5cdd7", "#efb6c6", "#e59cb1"];
    let baseAlpha = 0.9;
    const readPalette = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (n: string, fb: string) => cs.getPropertyValue(n).trim() || fb;
      palette = [v("--sakura-1", "#f5cdd7"), v("--sakura-2", "#efb6c6"), v("--sakura-3", "#e59cb1")];
      baseAlpha = document.documentElement.dataset.theme === "dark" ? 0.75 : 0.9;
    };
    readPalette();
    const mo = new MutationObserver(readPalette);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const petals: Petal[] = [];
    let raf = 0;
    let running = false;
    let last = 0;

    const drawPetal = (p: Petal, now: number, alpha: number) => {
      // 翻转：沿自身短轴压扁-展开，模拟花瓣在空气里打转
      const flutter = 0.45 + 0.55 * Math.abs(Math.sin(now * p.flutterFreq + p.phase));
      const s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, flutter);
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.85, -s * 0.52, s * 0.72, s * 0.55, 0, s);
      ctx.bezierCurveTo(-s * 0.72, s * 0.55, -s * 0.85, -s * 0.52, 0, -s);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.restore();
    };

    const step = (ts: number) => {
      const now = ts / 1000;
      const dt = Math.min(Math.max(now - last, 0.001), 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i];
        const age = now - p.born;
        if (age < 0) continue; // 还没轮到它出场（入场瓣错峰）
        p.vy += (p.term - p.vy) * Math.min(1, dt * 1.4);
        p.vx *= 1 - Math.min(1, dt * p.drag);
        p.x += (p.vx + Math.sin(now * p.swayFreq + p.phase) * p.swayAmp) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        let alpha = baseAlpha * Math.min(1, age / 0.35);
        if (p.life > 0) {
          const remain = p.life - age;
          if (remain <= 0) {
            petals.splice(i, 1);
            continue;
          }
          alpha *= Math.min(1, remain / 0.7);
        }
        alpha *= Math.max(0, Math.min(1, (h + 24 - p.y) / 110)); // 近底渐隐
        if (p.y > h + 30 || p.x < -80 || p.x > w + 80) {
          petals.splice(i, 1);
          continue;
        }
        if (alpha > 0.01) drawPetal(p, now, alpha);
      }
      if (petals.length) raf = requestAnimationFrame(step);
      else {
        running = false;
        ctx.clearRect(0, 0, w, h);
      }
    };
    const ensure = () => {
      if (running) return;
      running = true;
      last = performance.now() / 1000;
      raf = requestAnimationFrame(step);
    };

    const pick = () => palette[(Math.random() * palette.length) | 0];

    // 入场：一阵花瓣在 ~3s 内错峰入画，飘满一屏后自然散尽
    const entrance = () => {
      const now = performance.now() / 1000;
      const n = Math.round(Math.min(30, Math.max(16, w / 55)));
      for (let i = 0; i < n; i++) {
        petals.push({
          x: rnd(-0.02, 1.04) * w,
          y: rnd(-160, -20),
          vx: rnd(-26, -6), // 微微向左的风
          vy: rnd(8, 26),
          term: rnd(36, 66),
          drag: 0.05,
          size: rnd(5, 10.5),
          rot: rnd(0, Math.PI * 2),
          vr: rnd(-1.4, 1.4),
          swayAmp: rnd(10, 30),
          swayFreq: rnd(0.5, 1.4),
          phase: rnd(0, Math.PI * 2),
          flutterFreq: rnd(0.9, 2.1),
          color: pick(),
          born: now + rnd(0, 2.8),
          life: 0,
        });
      }
      ensure();
    };

    // 点击：从点击处散出几瓣，向外一撩再飘落
    const burst = (x: number, y: number) => {
      if (petals.length > 90) return;
      const now = performance.now() / 1000;
      const n = 5 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        petals.push({
          x: x + rnd(-6, 6),
          y: y + rnd(-6, 4),
          vx: rnd(-85, 85),
          vy: rnd(-48, 6),
          term: rnd(56, 96),
          drag: 1.6,
          size: rnd(4, 8),
          rot: rnd(0, Math.PI * 2),
          vr: rnd(-2.4, 2.4),
          swayAmp: rnd(6, 16),
          swayFreq: rnd(0.8, 1.8),
          phase: rnd(0, Math.PI * 2),
          flutterFreq: rnd(1.2, 2.6),
          color: pick(),
          born: now,
          life: rnd(1.5, 2.3),
        });
      }
      ensure();
    };
    const onClick = (e: MouseEvent) => burst(e.clientX, e.clientY);
    window.addEventListener("click", onClick, true);

    entrance();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", onClick, true);
      mo.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="no-print pointer-events-none fixed inset-0 z-[75]"
    />
  );
}
