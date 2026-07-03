"use client";

// 水墨小黑猫 v2：一具连续身体（身/头耳/尾各自小幅跟随，绝不换轮廓、不切透明度）。
// 之旅：画外一道弧线跃入 → 枝上小顿蓄力 → 一段长滞空大跳 → 软着陆收拢成卧姿。
// 编舞在 globals.css（rr-cat2-*）；此处只有形体、点击彩蛋、密码错误甩尾（rr-cat-flick 事件）。
// 与 InkPainting 同 viewBox + slice 裁切 → 坐标严格对齐画中枝干。
import { useEffect, useState } from "react";

export function InkCat() {
  const [hop, setHop] = useState(0);
  const [flick, setFlick] = useState(false);

  useEffect(() => {
    const onFlick = () => {
      setFlick(true);
      setTimeout(() => setFlick(false), 900);
    };
    window.addEventListener("rr-cat-flick", onFlick);
    return () => window.removeEventListener("rr-cat-flick", onFlick);
  }, []);

  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMin slice"
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      aria-hidden
      focusable="false"
    >
      <g className="rr-cat2">
        <g className="rr-cat2-core">
          <g
            key={hop}
            className={hop ? "rr-cat-hop" : undefined}
            style={{ pointerEvents: "auto", cursor: "pointer" }}
            onClick={() => setHop((v) => v + 1)}
          >
            {/* 身躯：长身低卧、后臀微拱（参考猫的慵懒），头颈抬离背线 */}
            <path
              d="M -30 0 C -34 -3 -34 -9 -29 -12 C -20 -16 -4 -17 6 -16 C 11 -16 15 -18 18 -19 C 22 -20 25 -17 25 -12 C 25 -7 23 -3 20 -1 C 18 1 15 1 13 0 Z"
              fill="var(--cat-fill)"
              stroke="var(--cat-line)"
              strokeWidth="0.8"
            />
            {/* 前爪沿枝前伸（参考图的搭爪） */}
            <path
              d="M -30 -3 C -36 -3 -42 -2 -46 -0.5 C -48 0.5 -48 2.4 -45.5 2.4 L -28 2 Z"
              fill="var(--cat-fill)"
            />
            {/* 颈胸：从前肩托起头部 */}
            <path d="M -33 0 C -36 -8 -35 -15 -30 -20 L -22 -13 L -20 0 Z" fill="var(--cat-fill)" />
            {/* 尾巴：更长的垂尾带螺旋卷（滞空后扬 → 落定垂钩），落定后缓缓摆 */}
            <g className={`rr-cat2-tailroot${flick ? " rr-cat-flick" : ""}`} transform="translate(23 -7)">
              <path
                className="rr-cat-tail"
                d="M 0 0 C 9 7 13 17 10 26 C 8 33 0 37 -6 34 C -11 31.5 -10.5 25.5 -5.5 24.5"
                stroke="var(--cat-fill)"
                strokeWidth="4.6"
                fill="none"
                strokeLinecap="round"
              />
            </g>
            {/* 头 + 双耳 + 一线月色眼：一个组，永远一体，高于背线 */}
            <g className="rr-cat2-head" transform="translate(-31 -26)">
              <circle r="7.2" fill="var(--cat-fill)" stroke="var(--cat-line)" strokeWidth="0.8" />
              <path d="M -6 -3.5 L -4.5 -12.5 L 1.2 -5 Z" fill="var(--cat-fill)" />
              <path className="rr-cat-ear" d="M 2.6 -5 L 6 -13 L 9.5 -4.5 Z" fill="var(--cat-fill)" />
              <ellipse className="rr-cat-eye" cx="-3.4" cy="-0.5" rx="1.5" ry="0.9" fill="var(--color-paper)" opacity=".9" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
