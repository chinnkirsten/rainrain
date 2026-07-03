// 水墨樱枝：干笔触质感（feTurbulence 置换）+ 墨迹入场（pathLength 归一后 dash 描画）
// + 花朵错峰绽放 + 整枝极缓摇曳。纯 SVG/CSS，无客户端 JS；配色全走主题变量。
// 注意：滤镜 id 固定（"rr-brush"），因此每个页面最多放一枝。

function Blossom({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="rr-bloom" style={{ animationDelay: `${delay}s` }}>
        {[0, 72, 144, 216, 288].map((a) => (
          <path
            key={a}
            transform={`rotate(${a})`}
            d="M0 0 C 5 -2.6 6.2 -8.4 0 -12.6 C -6.2 -8.4 -5 -2.6 0 0"
            fill="var(--sakura-1)"
          />
        ))}
        <circle r="2" fill="var(--sakura-3)" />
        {[30, 102, 174, 246, 318].map((a) => (
          <circle
            key={a}
            transform={`rotate(${a}) translate(0 -4.6)`}
            r="0.8"
            fill="var(--color-accent)"
            opacity=".5"
          />
        ))}
      </g>
    </g>
  );
}

function Bud({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="rr-bloom" style={{ animationDelay: `${delay}s` }}>
        <circle r="3.4" fill="var(--sakura-2)" />
        <path
          d="M -2.6 2.4 C -1 4.2 1 4.2 2.6 2.4"
          stroke="var(--color-ink)"
          strokeWidth="0.9"
          fill="none"
          opacity=".4"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

export function InkBranch({ className = "" }: { className?: string }) {
  const fid = "rr-brush";

  // 描画节奏：主枝先行，细枝随后，花在枝到处开
  const stroke = (
    d: string,
    width: number,
    opacity: number,
    delay: number,
    dur: number,
  ) => (
    <path
      className="rr-ink"
      d={d}
      pathLength={1}
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth={width}
      strokeLinecap="round"
      opacity={opacity}
      style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
    />
  );

  const MAIN = "M 566 40 C 488 58 414 76 348 96 C 280 116 214 142 162 180";
  const TAPER = "M 208 156 C 178 172 152 190 134 212";
  const TWIG_UP = "M 424 62 C 420 40 428 20 448 6";
  const TWIG_DROOP = "M 348 96 C 338 132 344 162 368 192";
  const TWIG_LOW = "M 162 180 C 148 196 138 212 132 232";

  return (
    <svg
      viewBox="0 0 560 340"
      className={`rr-branch ${className}`}
      aria-hidden
      focusable="false"
    >
      <defs>
        <filter id={fid} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.013 0.68" numOctaves="2" seed="8" />
          <feDisplacementMap in="SourceGraphic" scale="2.6" />
        </filter>
      </defs>
      <g className="rr-branch-sway">
        <g filter={`url(#${fid})`}>
          {/* 湿墨晕染底层 */}
          {stroke(MAIN, 11, 0.07, 0.1, 1.7)}
          {/* 笔芯 */}
          {stroke(MAIN, 5, 0.78, 0.1, 1.5)}
          {stroke(TAPER, 2.6, 0.72, 1.15, 0.8)}
          {stroke(TWIG_UP, 2.2, 0.7, 0.9, 0.7)}
          {stroke(TWIG_DROOP, 2.2, 0.7, 1.0, 0.8)}
          {stroke(TWIG_LOW, 1.7, 0.65, 1.5, 0.6)}
        </g>
        <Blossom x={448} y={8} s={1.05} delay={1.7} />
        <Blossom x={368} y={194} s={1.15} delay={1.95} />
        <Blossom x={132} y={232} s={0.95} delay={2.25} />
        <Blossom x={262} y={122} s={0.85} delay={1.55} />
        <Bud x={500} y={46} delay={1.35} />
        <Bud x={388} y={86} s={0.9} delay={1.6} />
        <Bud x={178} y={168} s={0.85} delay={2.05} />
      </g>
    </svg>
  );
}
