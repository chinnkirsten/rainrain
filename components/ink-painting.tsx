// 整幅水墨樱梅图：浓墨折枝 + 灰墨晕染 + 成簇朱红/粉樱 + 白蕊 + 点苔 + 碎瓣 + 朱印。
// 纯 SVG/CSS（描画/绽放/晕开动画在 globals.css），配色全走主题变量，明暗两式自适应。
// 滤镜/渐变 id 固定（rrp-*），每个页面最多放一幅。

type Tone = "red" | "pink";
type F = [x: number, y: number, s: number, rot: number, tone: Tone];
type B = [x: number, y: number, s: number, tone: Tone];
type Stroke = [d: string, w: number, delay: number, dur: number];

/* ———— 花・蕾・苔 ———— */

function Flower({ x, y, s, rot, tone, delay }: { x: number; y: number; s: number; rot: number; tone: Tone; delay: number }) {
  const fill = tone === "red" ? "url(#rrp-r)" : "url(#rrp-p)";
  const stamen = tone === "red" ? "var(--color-paper)" : "var(--blossom-1)";
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <g className="rr-bloom" style={{ animationDelay: `${delay}s` }}>
        {[0, 72, 144, 216, 288].map((a) => (
          <path key={a} transform={`rotate(${a})`} d="M0 0 C 5 -2.6 6.2 -8.4 0 -12.6 C -6.2 -8.4 -5 -2.6 0 0" fill={fill} />
        ))}
        <circle r="1.5" fill="var(--color-gold)" opacity=".9" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <circle key={a} transform={`rotate(${a + 18}) translate(0 -4.1)`} r="0.72" fill={stamen} opacity=".92" />
        ))}
      </g>
    </g>
  );
}

function Bud({ x, y, s, tone, delay }: { x: number; y: number; s: number; tone: Tone; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="rr-bloom" style={{ animationDelay: `${delay}s` }}>
        <circle r="3.3" fill={tone === "red" ? "var(--blossom-2)" : "var(--sakura-2)"} />
        <path d="M -2.5 2.2 Q 0 4.6 2.5 2.2" stroke="var(--color-ink)" strokeWidth="0.9" fill="none" opacity=".45" strokeLinecap="round" />
        <path d="M 0 3.4 L 0 6.6" stroke="var(--color-ink)" strokeWidth="0.8" opacity=".4" strokeLinecap="round" />
      </g>
    </g>
  );
}

/* ———— 朱印 ———— */

function Seal({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const ch = size / 3.6;
  return (
    <g transform={`translate(${x} ${y}) rotate(-3.5)`} filter="url(#rrp-brush)">
      <g className="rr-wash" style={{ animationDelay: `${delay}s` }}>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={size * 0.12} fill="var(--blossom-2)" opacity=".92" />
        {["茅", "草", "屋"].map((c, i) => (
          <text
            key={c}
            x="0"
            y={-size / 2 + size * 0.31 + i * size * 0.285}
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontWeight="700"
            fontSize={ch}
            fill="var(--color-paper)"
          >
            {c}
          </text>
        ))}
      </g>
    </g>
  );
}

/* ———— 通用图层 ———— */

function Strokes({ list }: { list: Stroke[] }) {
  return (
    <g filter="url(#rrp-brush)">
      {list.map(([d, w, delay, dur], i) => (
        <path
          key={i}
          className="rr-ink"
          d={d}
          pathLength={1}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={w}
          strokeLinecap="round"
          opacity={0.9}
          style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
        />
      ))}
    </g>
  );
}

function Washes({ list }: { list: [number, number, number, number, number, number][] }) {
  // [cx, cy, rx, ry, blur, opacity]
  return (
    <>
      {list.map(([cx, cy, rx, ry, blur, op], i) => (
        <ellipse
          key={i}
          className="rr-wash"
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="var(--color-ink)"
          opacity={op}
          style={{ filter: `blur(${blur}px)`, animationDelay: `${i * 0.25}s` }}
        />
      ))}
    </>
  );
}

function Silhouettes({ list }: { list: [string, number][] }) {
  return (
    <g style={{ filter: "blur(2.5px)" }}>
      {list.map(([d, w], i) => (
        <path key={i} className="rr-wash" d={d} fill="none" stroke="var(--color-ink)" strokeWidth={w} strokeLinecap="round" opacity=".14" style={{ animationDelay: `${0.3 + i * 0.2}s` }} />
      ))}
    </g>
  );
}

function Moss({ list }: { list: [number, number, number][] }) {
  return (
    <>
      {list.map(([x, y, r], i) => (
        <circle key={i} className="rr-wash" cx={x} cy={y} r={r} fill="var(--color-ink)" opacity=".55" style={{ animationDelay: `${1.5 + i * 0.04}s` }} />
      ))}
    </>
  );
}

function Specks({ list }: { list: [number, number, number, number, Tone, number?][] }) {
  // 纸上碎瓣：[x, y, rx, rot, tone, blur?]
  return (
    <>
      {list.map(([x, y, rx, rot, tone, blur], i) => (
        <ellipse
          key={i}
          className="rr-wash"
          cx={x}
          cy={y}
          rx={rx}
          ry={rx * 0.62}
          transform={`rotate(${rot} ${x} ${y})`}
          fill={tone === "red" ? "var(--blossom-2)" : "var(--sakura-2)"}
          opacity={0.16 + (i % 4) * 0.07}
          style={{ animationDelay: `${2 + i * 0.05}s`, ...(blur ? { filter: `blur(${blur}px)` } : {}) }}
        />
      ))}
    </>
  );
}

function Defs() {
  return (
    <defs>
      <filter id="rrp-brush" x="-12%" y="-12%" width="124%" height="124%">
        <feTurbulence type="fractalNoise" baseFrequency="0.011 0.55" numOctaves="2" seed="11" />
        <feDisplacementMap in="SourceGraphic" scale="3.2" />
      </filter>
      <radialGradient id="rrp-r" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="13">
        <stop offset="0%" stopColor="var(--blossom-1)" />
        <stop offset="58%" stopColor="var(--blossom-2)" />
        <stop offset="100%" stopColor="var(--blossom-3)" />
      </radialGradient>
      <radialGradient id="rrp-p" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="13">
        <stop offset="0%" stopColor="var(--sakura-3)" />
        <stop offset="58%" stopColor="var(--sakura-2)" />
        <stop offset="100%" stopColor="var(--sakura-1)" />
      </radialGradient>
    </defs>
  );
}

/* ———— 入场全幅（登录页，1440×900，slice 裁切铺满） ———— */

const E_STROKES: Stroke[] = [
  // 顶部主枝（折枝沿上缘横卷，中央留素）
  ["M 1465 150 C 1370 122 1286 100 1200 92", 16, 0.05, 0.8],
  ["M 1200 92 C 1108 84 1030 92 950 110", 12, 0.35, 0.7],
  ["M 950 110 C 862 130 800 122 730 100", 8.5, 0.65, 0.7],
  ["M 730 100 C 662 80 606 84 552 108", 5.5, 0.95, 0.7],
  ["M 552 108 C 508 126 484 152 470 186", 3.4, 1.25, 0.6],
  ["M 470 186 C 462 212 466 232 478 250", 1.8, 1.5, 0.5],
  // 上挑小枝
  ["M 1108 86 C 1096 52 1102 26 1122 4", 4, 0.8, 0.6],
  ["M 950 110 C 946 76 954 46 976 20", 2.6, 0.95, 0.5],
  ["M 862 128 C 858 100 864 76 880 56", 2.2, 1.05, 0.5],
  // 右侧垂枝（挂花串）
  ["M 1286 104 C 1298 150 1296 196 1272 240", 4, 0.7, 0.7],
  ["M 1272 240 C 1258 272 1256 300 1272 330", 2, 1.15, 0.5],
  // 底部副枝（贴下缘，微升）
  ["M -20 810 C 100 792 210 776 320 768", 9, 0.5, 0.7],
  ["M 320 768 C 420 760 500 766 570 790", 5, 0.85, 0.6],
  ["M 320 768 C 350 726 390 696 440 680", 3.4, 1.0, 0.6],
  ["M 440 680 C 470 668 496 668 520 680", 1.8, 1.3, 0.4],
  ["M 570 790 C 610 800 640 816 660 840", 2.4, 1.15, 0.5],
];

const E_FLOWERS: F[] = [
  // 顶枝第一肘
  [1198, 84, 1.2, 10, "red"],
  [1170, 104, 0.95, -30, "pink"],
  [1228, 106, 0.8, 150, "red"],
  // 顶枝中段大簇
  [1032, 84, 1.3, 0, "red"],
  [1000, 106, 1.05, 40, "red"],
  [1064, 104, 0.9, -25, "pink"],
  [958, 96, 0.9, -10, "red"],
  // 上挑枝梢
  [1122, 8, 0.9, -20, "red"],
  [976, 24, 0.85, -15, "pink"],
  [992, 8, 0.65, 20, "red"],
  [882, 52, 0.8, -15, "pink"],
  // 中段补簇（枝腹与枝背）
  [846, 140, 0.9, 60, "red"],
  [808, 132, 0.75, -20, "pink"],
  [790, 96, 0.7, 160, "red"],
  // 第二肘
  [728, 90, 1.15, 15, "red"],
  [700, 110, 0.9, -35, "pink"],
  [756, 116, 0.8, 140, "red"],
  [604, 80, 0.95, 25, "pink"],
  [548, 122, 0.85, 50, "red"],
  // 左端垂梢
  [472, 180, 1.0, -20, "red"],
  [448, 204, 0.8, 30, "pink"],
  [482, 226, 0.7, 170, "red"],
  // 右侧垂枝花串
  [1276, 244, 1.0, 20, "red"],
  [1258, 282, 0.85, -25, "pink"],
  [1272, 322, 0.75, 160, "red"],
  // 底部副枝
  [442, 672, 1.1, -20, "red"],
  [414, 696, 0.85, 40, "pink"],
  [500, 672, 0.8, 160, "pink"],
  [498, 762, 0.9, -10, "red"],
  [208, 772, 0.95, 20, "pink"],
  [656, 836, 0.8, 30, "red"],
];

const E_BUDS: B[] = [
  [1246, 80, 0.95, "red"],
  [990, 74, 0.85, "pink"],
  [936, 126, 0.8, "red"],
  [896, 40, 0.7, "red"],
  [770, 84, 0.9, "red"],
  [636, 76, 0.75, "pink"],
  [456, 244, 0.7, "pink"],
  [492, 164, 0.7, "red"],
  [480, 258, 0.6, "red"],
  [1284, 344, 0.75, "pink"],
  [524, 684, 0.75, "red"],
  [388, 712, 0.7, "pink"],
  [540, 780, 0.7, "pink"],
  [676, 852, 0.65, "red"],
  [160, 790, 0.7, "red"],
];

const E_MOSS: [number, number, number][] = [
  [1200, 98, 2.4],
  [1108, 88, 1.8],
  [952, 112, 2.4],
  [862, 130, 2],
  [732, 104, 2.2],
  [556, 112, 1.8],
  [466, 200, 1.6],
  [1288, 110, 1.6],
  [1274, 244, 1.4],
  [324, 770, 2],
  [444, 684, 1.6],
  [574, 792, 1.8],
];

const E_WASHES: [number, number, number, number, number, number][] = [
  [1050, 120, 300, 110, 26, 0.12],
  [700, 120, 220, 90, 28, 0.09],
  [420, 770, 260, 100, 26, 0.1],
  [1280, 280, 140, 120, 28, 0.08],
  [250, 180, 180, 90, 30, 0.05],
];

const E_SIL: [string, number][] = [
  ["M 1420 210 C 1330 190 1250 182 1170 186 C 1090 190 1020 202 960 220", 5],
  ["M 90 730 C 180 716 260 708 330 706", 4],
];

const E_SPECKS: [number, number, number, number, Tone, number?][] = [
  [540, 340, 4.5, 30, "red"],
  [440, 400, 3.5, -20, "pink"],
  [620, 440, 3, 60, "pink", 1.5],
  [340, 480, 4, 15, "red"],
  [250, 350, 3.2, -45, "pink"],
  [170, 540, 4.4, 70, "red", 1.5],
  [140, 320, 3.4, 20, "pink"],
  [930, 400, 3.8, -30, "red"],
  [1010, 520, 3, 45, "pink"],
  [1120, 440, 4.2, 10, "red"],
  [1230, 560, 3.4, -60, "pink", 1.5],
  [860, 620, 3.6, 25, "red"],
  [760, 700, 4.4, -15, "pink"],
  [980, 700, 3, 50, "red"],
  [1100, 760, 3.8, -40, "pink"],
  [200, 120, 3.6, 35, "pink"],
  [320, 200, 4, -25, "red", 1.5],
  [1340, 460, 3.6, 55, "pink"],
];

/* ———— 首页 hero（900×560） ———— */

const H_STROKES: Stroke[] = [
  ["M 908 72 C 812 94 736 118 660 146", 12, 0.05, 0.8],
  ["M 660 146 C 566 178 510 198 458 228", 8, 0.35, 0.7],
  ["M 458 228 C 402 262 375 304 364 352", 5, 0.65, 0.7],
  ["M 364 352 C 358 392 366 422 384 450", 2.6, 0.95, 0.6],
  ["M 566 182 C 548 136 556 96 588 56", 3.6, 0.8, 0.6],
  ["M 588 56 C 596 32 610 14 630 4", 2, 1.15, 0.5],
  ["M 786 100 C 792 122 804 138 822 148", 2, 0.6, 0.5],
];

const H_FLOWERS: F[] = [
  [660, 138, 1.15, 10, "red"],
  [632, 160, 0.9, -30, "pink"],
  [688, 162, 0.8, 150, "red"],
  [512, 188, 1.25, 0, "red"],
  [482, 212, 1.0, 40, "pink"],
  [544, 214, 0.85, -25, "red"],
  [450, 240, 0.9, 60, "red"],
  [368, 344, 0.95, 15, "red"],
  [352, 388, 0.75, -20, "pink"],
  [388, 446, 0.65, 30, "red"],
  [586, 52, 0.95, -20, "red"],
  [612, 26, 0.8, 30, "pink"],
  [632, 6, 0.65, -10, "red"],
  [824, 152, 0.8, 25, "pink"],
];

const H_BUDS: B[] = [
  [712, 132, 0.85, "red"],
  [578, 220, 0.75, "pink"],
  [420, 300, 0.8, "red"],
  [374, 420, 0.7, "pink"],
  [604, 90, 0.7, "red"],
  [646, 20, 0.65, "pink"],
  [836, 132, 0.7, "red"],
  [494, 246, 0.7, "pink"],
];

const H_MOSS: [number, number, number][] = [
  [664, 150, 2],
  [516, 204, 2.2],
  [462, 232, 1.8],
  [370, 356, 1.6],
  [572, 120, 1.4],
];

const H_WASHES: [number, number, number, number, number, number][] = [
  [600, 170, 250, 120, 24, 0.11],
  [400, 330, 180, 120, 26, 0.08],
];

const H_SIL: [string, number][] = [["M 880 190 C 790 214 720 232 650 258", 4]];

const H_SPECKS: [number, number, number, number, Tone, number?][] = [
  [260, 140, 3.6, 30, "pink"],
  [180, 260, 3, -20, "red"],
  [320, 420, 4, 15, "pink", 1.5],
  [520, 320, 3.2, -45, "red"],
  [720, 300, 3.6, 25, "pink"],
  [800, 420, 3, -30, "red"],
  [120, 420, 3.4, 60, "pink"],
  [440, 120, 3, 45, "red", 1.5],
  [760, 40, 3.2, -15, "pink"],
  [90, 100, 3.6, 20, "red"],
];

export function InkPainting({
  variant,
  className = "",
}: {
  variant: "entrance" | "hero";
  className?: string;
}) {
  const entrance = variant === "entrance";
  return (
    <svg
      viewBox={entrance ? "0 0 1440 900" : "0 0 900 560"}
      preserveAspectRatio={entrance ? "xMidYMid slice" : "xMidYMid meet"}
      className={className}
      aria-hidden
      focusable="false"
    >
      <Defs />
      <Washes list={entrance ? E_WASHES : H_WASHES} />
      <Silhouettes list={entrance ? E_SIL : H_SIL} />
      <Strokes list={entrance ? E_STROKES : H_STROKES} />
      <Moss list={entrance ? E_MOSS : H_MOSS} />
      {(entrance ? E_FLOWERS : H_FLOWERS).map(([x, y, s, rot, tone], i) => (
        <Flower key={i} x={x} y={y} s={s} rot={rot} tone={tone} delay={1.1 + i * 0.045} />
      ))}
      {(entrance ? E_BUDS : H_BUDS).map(([x, y, s, tone], i) => (
        <Bud key={i} x={x} y={y} s={s} tone={tone} delay={1.5 + i * 0.06} />
      ))}
      <Specks list={entrance ? E_SPECKS : H_SPECKS} />
      <Seal
        x={entrance ? 1382 : 762}
        y={entrance ? 226 : 470}
        size={entrance ? 60 : 46}
        delay={2.6}
      />
    </svg>
  );
}
