// 整幅水墨樱梅图：浓墨折枝 + 灰墨晕染 + 没骨点染花团 + 细杈碎红 + 疏影横斜 + 朱印。
// 纯 SVG/CSS（描画/绽放/晕开动画在 globals.css），配色全走主题变量，明暗两式自适应。
// 滤镜/渐变 id 固定（rrp-*），每个页面最多放一幅。
// 所有"随机感"来自确定性抖动表（JR/JS + seed）——服务端/客户端渲染一致，不破坏水合。

type Tone = "red" | "pink";
type F = [x: number, y: number, s: number, rot: number, tone: Tone];
type B = [x: number, y: number, s: number, tone: Tone];
type D = [x: number, y: number, r: number, tone: Tone];
type Stroke = [d: string, w: number, delay: number, dur: number];
type Sil = [d: string, w: number, op: number];

/* 确定性抖动表：角度 / 尺度 */
const JR = [14, -9, 22, -17, 6, 19, -12, 8, -21, 15, -5, 11];
const JS = [0.92, 1.14, 0.86, 1.08, 0.97, 1.18, 0.9, 1.04, 0.82, 1.1, 0.95, 1.06];

/* ———— 花・蕾・碎红・苔 ———— */

// 没骨点染：一朵花 = 五瓣不规则色斑挤在一起，深浅相间；只给部分大花随手点三笔蕊
function Flower({ x, y, s, rot, tone, seed, delay }: { x: number; y: number; s: number; rot: number; tone: Tone; seed: number; delay: number }) {
  const deep = tone === "red" ? "var(--blossom-1)" : "var(--sakura-3)";
  const mid = tone === "red" ? "var(--blossom-2)" : "var(--sakura-2)";
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <g className="rr-bloom" style={{ animationDelay: `${delay}s` }}>
        {[0, 72, 144, 216, 288].map((a, k) => {
          const j = (seed + k) % 12;
          return (
            <ellipse
              key={k}
              transform={`rotate(${a + JR[j]}) translate(0 ${-(5.2 * JS[(j + 5) % 12]).toFixed(2)})`}
              rx={(3.2 * JS[j]).toFixed(2)}
              ry={(4.5 * JS[(j + 7) % 12]).toFixed(2)}
              fill={k % 2 === 0 ? deep : mid}
              opacity=".96"
            />
          );
        })}
        <circle r="2" fill={deep} />
        {s >= 0.95 && seed % 3 === 0 &&
          [-34, 10, 48].map((a) => (
            <circle key={a} transform={`rotate(${a + JR[seed % 12]}) translate(0 -2.6)`} r="0.75" fill="var(--color-paper)" opacity=".85" />
          ))}
      </g>
    </g>
  );
}

function Bud({ x, y, s, tone, delay }: { x: number; y: number; s: number; tone: Tone; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="rr-bloom" style={{ animationDelay: `${delay}s` }}>
        <circle r="3.8" fill={tone === "red" ? "var(--blossom-2)" : "var(--sakura-2)"} />
        <path d="M -2.5 2.2 Q 0 4.6 2.5 2.2" stroke="var(--color-ink)" strokeWidth="0.9" fill="none" opacity=".45" strokeLinecap="round" />
        <path d="M 0 3.4 L 0 6.6" stroke="var(--color-ink)" strokeWidth="0.8" opacity=".4" strokeLinecap="round" />
      </g>
    </g>
  );
}

// 碎红：细杈梢头的单点远花/苞
function Dots({ list }: { list: D[] }) {
  return (
    <>
      {list.map(([x, y, r, tone], i) => (
        <circle
          key={i}
          className="rr-bloom"
          cx={x}
          cy={y}
          r={(r * 1.25).toFixed(2)}
          fill={tone === "red" ? "var(--blossom-2)" : "var(--sakura-2)"}
          opacity=".85"
          style={{ animationDelay: `${1.35 + i * 0.045}s` }}
        />
      ))}
    </>
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
          strokeLinejoin="round"
          opacity={0.9}
          style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
        />
      ))}
    </g>
  );
}

/* ———— 程序化细杈（确定性种子 → SSR/CSR 一致） ———— */

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Gen = { strokes: Stroke[]; flowers: F[]; dots: D[] };

// 折枝细杈：角折线递归分叉（梅枝的角劲），梢头缀小花/苞点
function grow(g: Gen, r: () => number, x: number, y: number, ang: number, len: number, depth: number, delay: number, bloom: number) {
  let cx = x;
  let cy = y;
  let a = ang;
  let d = `M ${cx.toFixed(1)} ${cy.toFixed(1)}`;
  const segs = 2 + ((r() * 2) | 0);
  for (let s = 0; s < segs; s++) {
    a += (r() - 0.5) * 56;
    const L = len * (0.7 + r() * 0.6);
    cx += Math.cos((a * Math.PI) / 180) * L;
    cy += Math.sin((a * Math.PI) / 180) * L;
    d += ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    const p = r();
    // 坐标一律定点化——避免服务端/客户端浮点字符串化末位不同导致水合警告
    if (p < bloom) g.flowers.push([+cx.toFixed(1), +cy.toFixed(1), +(0.42 + r() * 0.33).toFixed(2), (r() * 360) | 0, "red"]);
    else if (p < bloom + 0.3) g.dots.push([+cx.toFixed(1), +cy.toFixed(1), +(1.1 + r() * 1.3).toFixed(2), "red"]);
  }
  g.strokes.push([d, Math.max(0.7, depth * 0.5), delay, 0.4]);
  if (depth > 1) {
    const kids = 1 + ((r() * 2) | 0);
    for (let k = 0; k < kids; k++) grow(g, r, cx, cy, a + (r() - 0.5) * 100, len * 0.75, depth - 1, delay + 0.1, bloom);
  }
}

function genSystem(seed: number, roots: [number, number, number][], len: number, depth: number, bloom: number, delay0 = 1.0): Gen {
  const g: Gen = { strokes: [], flowers: [], dots: [] };
  const r = rng(seed);
  roots.forEach(([x, y, ang], i) => grow(g, r, x, y, ang, len, depth, delay0 + i * 0.05, bloom));
  return g;
}

// 树枝的影子：淡墨虚枝系统（bloom=0，只出灰点），整组糊在近处雾里
function ShadowSystem({ strokes, dots }: { strokes: Stroke[]; dots: D[] }) {
  return (
    <g style={{ filter: "blur(1.6px)" }}>
      {strokes.map(([d, w], i) => (
        <path key={i} className="rr-wash" d={d} fill="none" stroke="var(--color-ink)" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity=".18" style={{ animationDelay: `${0.5 + i * 0.02}s` }} />
      ))}
      {dots.map(([x, y, r2], i) => (
        <circle key={`d${i}`} className="rr-wash" cx={x} cy={y} r={r2 * 1.4} fill="var(--color-ink)" opacity=".14" style={{ animationDelay: `${0.7 + i * 0.03}s` }} />
      ))}
    </g>
  );
}

// 纸灯笼：挂在主枝上，只在夜里显形（CSS 控制），微微摇
function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g className="rr-lantern" transform={`translate(${x} ${y})`}>
      <g className="rr-lantern-sway">
        <circle cx="0" cy="34" r="26" fill="#e8a04c" opacity=".14" style={{ filter: "blur(10px)" }} />
        <path d="M 0 0 L 0 14" stroke="var(--color-ink)" strokeWidth="1.2" opacity=".6" />
        <ellipse cx="0" cy="34" rx="15" ry="19" fill="#c96f3f" opacity=".9" />
        <ellipse cx="0" cy="34" rx="15" ry="19" fill="none" stroke="#8f4526" strokeWidth="1" opacity=".7" />
        {[-8, 0, 8].map((dx) => (
          <path key={dx} d={`M ${dx} 16 Q ${dx * 1.4} 34 ${dx} 52`} stroke="#8f4526" strokeWidth="0.8" fill="none" opacity=".55" />
        ))}
        <rect x="-6" y="13" width="12" height="4" rx="1.5" fill="#5d4a2f" />
        <rect x="-6" y="51" width="12" height="4" rx="1.5" fill="#5d4a2f" />
        <path d="M 0 55 L 0 62 M -2.5 62 L 2.5 62" stroke="#a2372f" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />
      </g>
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

// 疏影横斜：远处的虚枝剪影 + 影中花点，一并糊在雾里
function Silhouettes({ strokes, ghosts }: { strokes: Sil[]; ghosts?: [number, number, number][] }) {
  return (
    <g style={{ filter: "blur(3px)" }}>
      {strokes.map(([d, w, op], i) => (
        <path key={i} className="rr-wash" d={d} fill="none" stroke="var(--color-ink)" strokeWidth={w} strokeLinecap="round" opacity={op} style={{ animationDelay: `${0.4 + i * 0.15}s` }} />
      ))}
      {(ghosts ?? []).map(([x, y, r], i) => (
        <ellipse key={`g${i}`} className="rr-wash" cx={x} cy={y} rx={r} ry={r * 0.85} fill="var(--blossom-2)" opacity=".3" style={{ animationDelay: `${0.8 + i * 0.06}s` }} />
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
      {/* 花斑滤镜：轻微揉边 + 微糊，让色斑有洇开的没骨感 */}
      <filter id="rrp-petal" x="-40%" y="-40%" width="180%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="2" />
        <feGaussianBlur stdDeviation="0.25" />
      </filter>
    </defs>
  );
}

/* ———— 入场全幅（登录页，1440×900，slice 裁切铺满） ———— */

const E_STROKES: Stroke[] = [
  // 顶部主枝（折枝沿上缘横卷，中央留素；首两段老干加宽）
  ["M 1465 150 C 1370 122 1286 100 1200 92", 20, 0.05, 0.8],
  ["M 1200 92 C 1108 84 1030 92 950 110", 13, 0.35, 0.7],
  // 老干浓淡：下缘错位深描，做出枯笔重按的两层墨
  ["M 1462 156 C 1372 128 1292 106 1210 97", 6, 0.15, 0.8],
  ["M 1198 97 C 1110 90 1036 97 960 114", 4.5, 0.45, 0.7],
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
  // 细杈（繁花所在）
  ["M 1240 100 C 1236 130 1244 156 1262 176", 1.6, 1.0, 0.5],
  ["M 1150 88 C 1142 120 1148 148 1164 170", 1.5, 1.05, 0.5],
  ["M 1064 88 C 1072 60 1070 36 1058 14", 1.5, 1.1, 0.5],
  ["M 1000 100 C 996 134 1004 162 1022 184", 1.6, 1.15, 0.5],
  ["M 900 118 C 890 148 892 176 908 200", 1.5, 1.2, 0.5],
  ["M 812 112 C 820 84 818 58 806 36", 1.4, 1.25, 0.5],
  ["M 662 88 C 654 62 656 38 668 16", 1.4, 1.3, 0.5],
  ["M 620 92 C 618 122 626 148 644 166", 1.4, 1.35, 0.5],
  ["M 510 130 C 500 156 500 182 512 206", 1.3, 1.4, 0.5],
];

const E_FLOWERS: F[] = [
  // 顶枝第一肘
  [1198, 84, 1.2, 10, "red"],
  [1170, 104, 0.95, -30, "red"],
  [1228, 106, 0.8, 150, "red"],
  // 顶枝中段大簇
  [1032, 84, 1.3, 0, "red"],
  [1000, 106, 1.05, 40, "red"],
  [1064, 104, 0.9, -25, "pink"],
  [958, 96, 0.9, -10, "red"],
  // 上挑枝梢
  [1122, 8, 0.9, -20, "red"],
  [976, 24, 0.85, -15, "red"],
  [992, 8, 0.65, 20, "red"],
  [882, 52, 0.8, -15, "red"],
  // 中段补簇（枝腹与枝背）
  [846, 140, 0.9, 60, "red"],
  [808, 132, 0.75, -20, "red"],
  [790, 96, 0.7, 160, "red"],
  // 第二肘
  [728, 90, 1.15, 15, "red"],
  [700, 110, 0.9, -35, "red"],
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
  // 细杈上的花
  [1262, 178, 0.7, 20, "red"],
  [1246, 140, 0.55, -30, "red"],
  [1164, 172, 0.75, 40, "red"],
  [1146, 124, 0.5, 10, "red"],
  [1058, 12, 0.7, -20, "red"],
  [1070, 42, 0.55, 150, "red"],
  [1022, 186, 0.7, 60, "red"],
  [1000, 138, 0.5, -40, "red"],
  [908, 202, 0.75, 30, "red"],
  [890, 152, 0.5, 170, "pink"],
  [806, 34, 0.7, -15, "red"],
  [818, 66, 0.5, 45, "red"],
  [668, 14, 0.7, 25, "red"],
  [656, 44, 0.55, -35, "red"],
  [644, 168, 0.7, 10, "red"],
  [622, 120, 0.5, 140, "red"],
  [512, 208, 0.65, -25, "red"],
  [500, 166, 0.5, 60, "red"],
  // 沿枝散花（填空隙）
  [1120, 92, 0.6, 80, "red"],
  [980, 102, 0.55, -70, "red"],
  [880, 124, 0.6, 30, "red"],
  [700, 98, 0.55, 120, "red"],
  [590, 96, 0.6, -50, "red"],
];

const E_BUDS: B[] = [
  [1246, 80, 0.95, "red"],
  [990, 74, 0.85, "red"],
  [936, 126, 0.8, "red"],
  [896, 40, 0.7, "red"],
  [770, 84, 0.9, "red"],
  [636, 76, 0.75, "pink"],
  [456, 244, 0.7, "pink"],
  [492, 164, 0.7, "red"],
  [480, 258, 0.6, "red"],
  [1284, 344, 0.75, "pink"],
];

const E_DOTS: D[] = [
  [1268, 190, 2.2, "red"],
  [1250, 158, 1.8, "red"],
  [1170, 182, 2, "red"],
  [1156, 140, 1.7, "red"],
  [1052, 26, 2, "red"],
  [1076, 52, 1.6, "red"],
  [1030, 196, 2, "red"],
  [1006, 152, 1.6, "red"],
  [916, 212, 2.2, "red"],
  [884, 168, 1.7, "pink"],
  [798, 46, 2, "red"],
  [824, 80, 1.6, "red"],
  [676, 26, 2, "red"],
  [648, 54, 1.6, "red"],
  [652, 178, 2, "red"],
  [618, 136, 1.6, "red"],
  [520, 218, 1.9, "red"],
  [494, 178, 1.5, "red"],
  [1310, 120, 1.8, "red"],
  [1216, 76, 1.6, "red"],
  [938, 92, 1.7, "red"],
  [758, 80, 1.6, "red"],
  [566, 130, 1.5, "pink"],
  [1096, 108, 1.6, "red"],
];

// 细杈根：沿主枝上下生发（角度上挑为主，几根下垂）
const E_TWIG_ROOTS: [number, number, number][] = [
  [1240, 100, -75],
  [1150, 88, -100],
  [1064, 88, -55],
  [1000, 100, -120],
  [900, 118, -70],
  [812, 112, -105],
  [730, 100, -60],
  [662, 88, -115],
  [620, 92, -45],
  [552, 108, -95],
  [510, 130, -70],
  [1320, 112, -40],
  [950, 110, 62],
  [790, 110, 76],
];
const E_TW = genSystem(7, E_TWIG_ROOTS, 34, 3, 0.42);

// 影枝：右下一条淡墨老干斜上，生出自己的细杈（参考图的"树枝影子"）
const E_SHADOW_SPINE: Stroke[] = [
  ["M 1460 640 C 1320 570 1210 528 1110 505", 15, 0, 0],
  ["M 1110 505 C 1020 486 940 486 870 500", 9, 0, 0],
];
const E_SH = genSystem(21, [
  [1300, 575, -80],
  [1180, 522, -100],
  [1100, 502, -60],
  [1000, 490, -115],
  [920, 492, -75],
], 42, 3, 0);

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
];

const E_WASHES: [number, number, number, number, number, number][] = [
  [1050, 120, 300, 110, 26, 0.12],
  [700, 120, 220, 90, 28, 0.09],
  [420, 790, 280, 100, 26, 0.09],
  [1280, 280, 140, 120, 28, 0.08],
  [250, 180, 180, 90, 30, 0.05],
];

// 疏影横斜：左下虚枝斜出，影里带几点残红
const E_SIL: Sil[] = [
  ["M 1420 210 C 1330 190 1250 182 1170 186 C 1090 190 1020 202 960 220", 5, 0.12],
  ["M -30 878 C 160 838 340 796 500 734", 6, 0.18],
  ["M -20 826 C 130 802 260 776 370 744", 3.5, 0.15],
  ["M 370 744 C 430 722 480 708 530 702", 2, 0.14],
  ["M 500 734 C 560 712 615 698 668 692", 2.4, 0.15],
  ["M 240 780 C 270 750 310 726 356 712", 1.8, 0.12],
];

const E_GHOSTS: [number, number, number][] = [
  [505, 730, 4],
  [535, 704, 3.2],
  [560, 700, 2.6],
  [672, 690, 3.6],
  [640, 696, 2.8],
  [360, 742, 3],
  [330, 752, 2.4],
  [240, 776, 3],
  [150, 806, 2.6],
  [430, 718, 2.2],
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
  // 细杈
  ["M 760 110 C 756 140 764 166 782 186", 1.6, 1.0, 0.5],
  ["M 596 160 C 588 190 592 216 608 238", 1.5, 1.1, 0.5],
  ["M 700 128 C 706 100 704 76 692 54", 1.4, 1.2, 0.5],
];

const H_FLOWERS: F[] = [
  [660, 138, 1.15, 10, "red"],
  [632, 160, 0.9, -30, "red"],
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
  [824, 152, 0.8, 25, "red"],
  // 细杈上的花
  [782, 188, 0.7, 30, "red"],
  [760, 146, 0.5, -20, "red"],
  [608, 240, 0.7, 50, "red"],
  [590, 196, 0.5, 10, "red"],
  [692, 52, 0.65, -30, "red"],
  [706, 84, 0.5, 160, "red"],
  [736, 120, 0.55, 90, "red"],
  [624, 168, 0.5, -60, "red"],
];

const H_BUDS: B[] = [
  [712, 132, 0.85, "red"],
  [578, 220, 0.75, "pink"],
  [420, 300, 0.8, "red"],
  [374, 420, 0.7, "pink"],
  [604, 90, 0.7, "red"],
  [646, 20, 0.65, "red"],
  [836, 132, 0.7, "red"],
  [494, 246, 0.7, "red"],
];

const H_DOTS: D[] = [
  [788, 198, 1.8, "red"],
  [766, 158, 1.5, "red"],
  [616, 250, 1.8, "red"],
  [596, 206, 1.4, "red"],
  [686, 42, 1.7, "red"],
  [712, 94, 1.4, "red"],
  [850, 140, 1.6, "red"],
  [540, 230, 1.5, "red"],
  [464, 250, 1.6, "red"],
  [398, 320, 1.5, "pink"],
  [430, 276, 1.4, "red"],
  [560, 172, 1.4, "red"],
];

const H_TW = genSystem(9, [
  [660, 146, -80],
  [560, 180, -110],
  [500, 205, -60],
  [430, 260, -95],
  [760, 110, -70],
  [610, 165, 70],
], 28, 2, 0.45);
const H_SHADOW_SPINE: Stroke[] = [["M 910 500 C 830 468 758 450 690 444", 10, 0, 0]];
const H_SH = genSystem(23, [
  [860, 478, -95],
  [770, 452, -70],
  [700, 446, -110],
], 34, 2, 0);

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

const H_SIL: Sil[] = [
  ["M 880 190 C 790 214 720 232 650 258", 4, 0.13],
  ["M 200 520 C 320 490 420 462 500 430", 3, 0.13],
  ["M 300 508 C 380 486 440 468 490 452", 2, 0.11],
];

const H_GHOSTS: [number, number, number][] = [
  [505, 428, 3],
  [478, 438, 2.4],
  [300, 496, 2.6],
  [520, 448, 2.2],
];

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
      preserveAspectRatio={entrance ? "xMidYMin slice" : "xMidYMid meet"}
      className={className}
      aria-hidden
      focusable="false"
    >
      <Defs />
      <Washes list={entrance ? E_WASHES : H_WASHES} />
      <Silhouettes strokes={entrance ? E_SIL : H_SIL} ghosts={entrance ? E_GHOSTS : H_GHOSTS} />
      <ShadowSystem
        strokes={entrance ? [...E_SHADOW_SPINE, ...E_SH.strokes] : [...H_SHADOW_SPINE, ...H_SH.strokes]}
        dots={entrance ? E_SH.dots : H_SH.dots}
      />
      <Strokes list={entrance ? [...E_STROKES, ...E_TW.strokes] : [...H_STROKES, ...H_TW.strokes]} />
      <Moss list={entrance ? E_MOSS : H_MOSS} />
      {entrance && <Lantern x={1240} y={99} />}
      <g filter="url(#rrp-petal)">
        {(entrance ? [...E_FLOWERS, ...E_TW.flowers] : [...H_FLOWERS, ...H_TW.flowers]).map(([x, y, s, rot, tone], i) => (
          <Flower key={i} x={x} y={y} s={s} rot={rot} tone={tone} seed={i} delay={1.05 + Math.min(i * 0.03, 1.7)} />
        ))}
        {(entrance ? E_BUDS : H_BUDS).map(([x, y, s, tone], i) => (
          <Bud key={i} x={x} y={y} s={s} tone={tone} delay={1.4 + i * 0.05} />
        ))}
        <Dots list={entrance ? [...E_DOTS, ...E_TW.dots] : [...H_DOTS, ...H_TW.dots]} />
      </g>
      <Specks list={entrance ? E_SPECKS : H_SPECKS} />
      <Seal
        x={entrance ? 1382 : 762}
        y={entrance ? 226 : 470}
        size={entrance ? 60 : 46}
        delay={2.4}
      />
    </svg>
  );
}
