// 版式小件：分隔线、空状态、加载点。无装饰图形。
import { t } from "@/lib/i18n";

/** 页面 h1 下的细分隔线 */
export function BrushRule({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block h-px w-16 bg-line-strong ${className}`} />;
}

/** 空状态：一行提示文案 */
export function InkEmpty({ hint }: { hint?: string }) {
  return (
    <div className="py-10 text-center">
      <p className="font-serif text-sm italic text-muted">{hint ?? t.empty_poem}</p>
    </div>
  );
}

/** 墨点呼吸：加载指示 */
export function InkLoading({ label }: { label?: string }) {
  return (
    <span className="rr-ink-dots inline-flex items-center gap-1.5 text-muted" role="status" aria-label={label ?? t.loading}>
      <i /><i /><i />
    </span>
  );
}
