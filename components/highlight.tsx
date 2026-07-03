import type { ReactNode } from "react";

/** 在文本中高亮命中的查询词（大小写不敏感） */
export function Highlight({ text, q }: { text: string; q?: string }) {
  const needle = (q ?? "").trim();
  if (!needle) return <>{text}</>;
  const lc = text.toLowerCase();
  const ln = needle.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;
  let idx = lc.indexOf(ln, i);
  while (idx >= 0) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={key++} className="rounded bg-gold/30 px-0.5 text-ink">
        {text.slice(idx, idx + needle.length)}
      </mark>,
    );
    i = idx + needle.length;
    idx = lc.indexOf(ln, i);
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
}
