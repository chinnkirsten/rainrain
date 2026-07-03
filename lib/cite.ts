import type { ResearchItem } from "./types";

/** 规范题录（中文式引用） */
export function citation(item: ResearchItem): string {
  const head: string[] = [];
  if (item.author) head.push(item.author);
  let core = `《${item.title}》`;
  if (item.edition) core += `（${item.edition}）`;
  head.push(core);
  let s = head.join("．");
  const tail = [item.publisher, item.year].filter(Boolean);
  if (tail.length) s += "，" + tail.join("，");
  const arch = [item.archive, item.callNumber].filter(Boolean);
  if (arch.length) s += `（${arch.join("，")}）`;
  return s + "．";
}

function bibKey(item: ResearchItem): string {
  const base = (item.author || item.title || "ref")
    .replace(/[^\w一-龥]/g, "")
    .slice(0, 10);
  return `${base}${item.year || ""}_${item.id.slice(0, 4)}`;
}

const RIS_TY: Record<string, string> = {
  pdf: "BOOK", doc: "BOOK", slides: "SLIDE", sheet: "DATA", data: "DATA",
  image: "FIGURE", audio: "SOUND", video: "VIDEO", archive: "GEN", other: "GEN",
};

export function toBibtex(items: ResearchItem[]): string {
  return items
    .map((item) => {
      const type = item.kind === "pdf" || item.kind === "doc" ? "book" : "misc";
      const f: string[] = [`title = {${item.title}}`];
      if (item.author) f.push(`author = {${item.author}}`);
      if (item.year) f.push(`year = {${item.year}}`);
      if (item.publisher) f.push(`publisher = {${item.publisher}}`);
      if (item.edition) f.push(`edition = {${item.edition}}`);
      const note = [item.archive, item.callNumber].filter(Boolean).join("; ");
      if (note) f.push(`note = {${note}}`);
      if (item.tags?.length) f.push(`keywords = {${item.tags.join(", ")}}`);
      return `@${type}{${bibKey(item)},\n  ${f.join(",\n  ")}\n}`;
    })
    .join("\n\n");
}

export function toRis(items: ResearchItem[]): string {
  return items
    .map((item) => {
      const L = [`TY  - ${RIS_TY[item.kind] || "GEN"}`, `TI  - ${item.title}`];
      if (item.author) L.push(`AU  - ${item.author}`);
      if (item.year) L.push(`PY  - ${item.year}`);
      if (item.publisher) L.push(`PB  - ${item.publisher}`);
      if (item.edition) L.push(`ET  - ${item.edition}`);
      const note = [item.archive, item.callNumber].filter(Boolean).join("; ");
      if (note) L.push(`N1  - ${note}`);
      (item.tags || []).forEach((t) => L.push(`KW  - ${t}`));
      L.push("ER  - ");
      return L.join("\n");
    })
    .join("\n\n");
}

export function toCsv(items: ResearchItem[]): string {
  const cols = [
    ["title", "标题"], ["author", "作者"], ["year", "年代"], ["publisher", "出版者"],
    ["edition", "版本"], ["archive", "藏所"], ["callNumber", "索书号"],
    ["kind", "类型"], ["phase", "阶段"], ["tags", "标签"], ["filename", "文件名"],
  ] as const;
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = cols.map(([, zh]) => esc(zh)).join(",");
  const rows = items.map((it) =>
    cols
      .map(([k]) => esc(k === "tags" ? (it.tags || []).join("; ") : (it as Record<string, unknown>)[k] as string))
      .join(","),
  );
  return [header, ...rows].join("\n");
}
