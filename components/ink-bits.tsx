// 全站水墨点缀件：空状态小枝、墨点加载、干笔触分隔线。
// 服务器/客户端均可用（纯 SVG/CSS，无 hook）。
import { t } from "@/lib/i18n";

/** 干笔触短横线：放在页面 h1 下，替代生硬的边框感 */
export function BrushRule({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 8" className={`h-2 w-28 ${className}`} aria-hidden focusable="false">
      <filter id="rrb-f" x="-10%" y="-150%" width="120%" height="400%">
        <feTurbulence type="fractalNoise" baseFrequency="0.18 0.9" numOctaves="2" seed="4" />
        <feDisplacementMap in="SourceGraphic" scale="3" />
      </filter>
      <path d="M 2 4.5 C 30 3 62 3 118 4" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".55" filter="url(#rrb-f)" />
    </svg>
  );
}

/** 空状态：一小枝水墨 + 一句诗。放进原空状态容器即可。 */
export function InkEmpty({ hint }: { hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <svg viewBox="0 0 160 90" className="h-[72px] w-32 opacity-90" aria-hidden focusable="false">
        <filter id="rre-f" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.6" numOctaves="2" seed="9" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
        <g filter="url(#rre-f)">
          <path d="M 156 64 C 120 52 88 46 58 44 C 38 43 22 46 10 52" stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".8" />
          <path d="M 66 45 C 60 34 60 24 68 14" stroke="var(--color-ink)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".7" />
          <path d="M 104 50 C 102 62 106 72 116 80" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".65" />
        </g>
        {[
          [68, 12, 3.4],
          [61, 26, 2.4],
          [118, 82, 3],
          [104, 66, 2.2],
          [30, 49, 2.6],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? "var(--sakura-2)" : "var(--blossom-2)"} opacity=".85" />
        ))}
      </svg>
      <p className="font-serif text-sm italic text-muted">{hint ?? t.empty_poem}</p>
    </div>
  );
}

/** 墨点呼吸：替代文字 Loading */
export function InkLoading({ label }: { label?: string }) {
  return (
    <span className="rr-ink-dots inline-flex items-center gap-1.5 text-muted" role="status" aria-label={label ?? t.loading}>
      <i /><i /><i />
    </span>
  );
}
