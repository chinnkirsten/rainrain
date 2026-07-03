// 纯函数：无服务端依赖，client / server 都可 import。
export type AnonPair = { from: string; to: string };

/** 把文本里所有「真名」替换成对应代号（简单全量字符串替换）。空的 from 跳过。 */
export function applyAnon(text: string, pairs: AnonPair[]): string {
  let out = text;
  for (const p of pairs) {
    const from = (p.from ?? "").trim();
    if (!from) continue;
    out = out.split(from).join(p.to ?? "");
  }
  return out;
}
