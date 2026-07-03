// 文献引用引擎：结构化著录 ↔ BibTeX / RIS / CrossRef，以及 APA / Chicago / GB-T-7714 成文引用。
// 目标不是重造 citeproc，而是把元数据「干净地收进来、规范地导出去」，让 Zotero/Word 也能接手。
import type { Reading, RefType } from "./types";

/** 结构化著录的可写子集（导入 / 手动录入时用）。 */
export type RefInput = Partial<
  Pick<
    Reading,
    | "citation" | "type" | "authors" | "title" | "container" | "publisher"
    | "volume" | "issue" | "pages" | "doi" | "url" | "year" | "tags"
  >
>;

const isCJK = (s: string) => /[一-鿿぀-ヿ가-힯]/.test(s);

/** 把作者字符串拆成 { family, given }；兼容 "Family, Given" / "Given Family" / 中文姓名。 */
function splitName(a: string): { family: string; given: string } {
  const s = a.trim();
  if (!s) return { family: "", given: "" };
  if (s.includes(",")) {
    const [family, ...rest] = s.split(",");
    return { family: family.trim(), given: rest.join(",").trim() };
  }
  if (isCJK(s) && !s.includes(" ")) return { family: s, given: "" }; // 中文名整体作姓名
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { family: parts[0], given: "" };
  return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(" ") };
}

/** 取名的首字母缩写："Dingxin" → "D.", "Karl Heinz" → "K. H." */
function initials(given: string): string {
  return given
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((p) => (isCJK(p) ? p : p[0].toUpperCase() + "."))
    .join(" ");
}

type Style = "apa" | "chicago" | "gbt";

/** 依样式格式化作者列表。 */
function formatAuthors(authors: string[] | undefined, style: Style): string {
  const list = (authors ?? []).map((a) => a.trim()).filter(Boolean);
  if (!list.length) return "";

  if (style === "gbt") {
    // GB/T 7714：中文「姓名」整体，西文「Family GG」（首字母无点）；超过 3 人取前 3 + 等
    const fmt = (a: string) => {
      const { family, given } = splitName(a);
      if (!given) return family;
      return `${family} ${initials(given).replace(/\./g, "")}`.trim();
    };
    const head = list.slice(0, 3).map(fmt).join("，");
    return list.length > 3 ? `${head}，等` : head;
  }

  if (style === "chicago") {
    // Chicago 作者-年份：首位 "Family, Given"，其余 "Given Family"
    const fmt = (a: string, i: number) => {
      const { family, given } = splitName(a);
      if (!given) return family;
      return i === 0 ? `${family}, ${given}` : `${given} ${family}`;
    };
    if (list.length === 1) return fmt(list[0], 0);
    if (list.length === 2) return `${fmt(list[0], 0)}, and ${fmt(list[1], 1)}`;
    return `${list.slice(0, -1).map(fmt).join(", ")}, and ${fmt(list[list.length - 1], list.length - 1)}`;
  }

  // APA 7：全部 "Family, I. I."，最后一位前加 &
  const fmt = (a: string) => {
    const { family, given } = splitName(a);
    return given ? `${family}, ${initials(given)}` : family;
  };
  const parts = list.map(fmt);
  if (parts.length === 1) return parts[0];
  if (parts.length > 20) return `${parts.slice(0, 19).join(", ")}, … ${parts[parts.length - 1]}`;
  return `${parts.slice(0, -1).join(", ")}, & ${parts[parts.length - 1]}`;
}

const clean = (s?: string) => (s ?? "").trim();
const dropTrailingDot = (s: string) => s.replace(/\.\s*$/, "");

/** APA 7（近似）。 */
export function formatApa(r: Reading): string {
  const au = formatAuthors(r.authors, "apa");
  const yr = r.year ? ` (${r.year}).` : au ? " (n.d.)." : "";
  // APA 作者块以姓名/首字母的句点收尾，后接 " (年)."，不可裁掉这个句点
  const head = au ? `${au}${yr}` : "";
  const title = clean(r.title);
  const bits: string[] = [];
  if (head) bits.push(head);
  if (r.type === "book" || r.type === "thesis") {
    if (title) bits.push(`${title}.`);
    const tail = [r.publisher, r.type === "thesis" ? "(学位论文)" : ""].filter(Boolean).join(" ");
    if (tail) bits.push(`${tail}.`);
  } else {
    if (title) bits.push(`${title}.`);
    const vol = r.volume ? `${r.volume}${r.issue ? `(${r.issue})` : ""}` : "";
    const cont = [clean(r.container), vol, clean(r.pages)].filter(Boolean).join(", ");
    if (cont) bits.push(`${cont}.`);
  }
  if (r.doi) bits.push(`https://doi.org/${r.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")}`);
  else if (r.url) bits.push(r.url);
  const out = bits.join(" ").trim();
  return out || r.citation;
}

/** Chicago 作者-年份（近似）。 */
export function formatChicago(r: Reading): string {
  const au = formatAuthors(r.authors, "chicago");
  const bits: string[] = [];
  if (au) bits.push(`${dropTrailingDot(au)}.`);
  if (r.year) bits.push(`${r.year}.`);
  const title = clean(r.title);
  if (r.type === "book" || r.type === "thesis") {
    if (title) bits.push(`${title}.`);
    if (r.publisher) bits.push(`${r.publisher}.`);
  } else {
    if (title) bits.push(`"${title}."`);
    const volIssue = [r.volume, r.issue ? `(${r.issue})` : ""].filter(Boolean).join(" ");
    const cont = [clean(r.container), volIssue].filter(Boolean).join(" ");
    if (cont) bits.push(`${cont}${r.pages ? `: ${r.pages}` : ""}.`);
    else if (r.pages) bits.push(`${r.pages}.`);
  }
  if (r.doi) bits.push(`https://doi.org/${r.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")}.`);
  const out = bits.join(" ").trim();
  return out || r.citation;
}

const GBT_MARK: Record<RefType, string> = {
  article: "[J]", book: "[M]", chapter: "[M]", thesis: "[D]", report: "[R]", web: "[EB/OL]", other: "[Z]",
};

/** GB/T 7714-2015（近似）。中文社科学位论文常用。 */
export function formatGbt(r: Reading): string {
  const au = formatAuthors(r.authors, "gbt");
  const title = clean(r.title);
  if (!title) return r.citation;
  const mark = GBT_MARK[r.type ?? "other"] ?? "[Z]";
  let s = au ? `${au}. ${title}${mark}` : `${title}${mark}`;
  if (r.type === "article") {
    const vol = r.volume ? `, ${r.volume}${r.issue ? `(${r.issue})` : ""}` : "";
    s += `. ${clean(r.container)}, ${clean(r.year)}${vol}${r.pages ? `: ${r.pages}` : ""}`;
  } else if (r.type === "web") {
    s += `. ${clean(r.url)}`;
  } else {
    const tail = [clean(r.publisher), clean(r.year)].filter(Boolean).join(", ");
    if (tail) s += `. ${tail}`;
  }
  return s.replace(/\s+/g, " ").replace(/\.\s*\./g, ".").trim().replace(/\.?$/, ".");
}

export function formatCitation(r: Reading, style: Style): string {
  return style === "gbt" ? formatGbt(r) : style === "chicago" ? formatChicago(r) : formatApa(r);
}

/** 供列表展示 / 搜索的一行题录：优先结构化，回退自由 citation。 */
export function composeCitation(r: RefInput): string {
  if (!r.title) return clean(r.citation);
  const au = (r.authors ?? []).join(", ");
  const vol = r.volume ? `${r.volume}${r.issue ? `(${r.issue})` : ""}` : "";
  const tail = [clean(r.container), vol, clean(r.pages)].filter(Boolean).join(", ");
  return [au ? `${au}.` : "", `${clean(r.title)}.`, tail ? `${tail}.` : "", r.year ?? ""]
    .filter(Boolean)
    .join(" ")
    .trim();
}

const bibKey = (r: Reading) => {
  const a = (r.authors?.[0] ?? r.title ?? "ref").replace(/[^\w一-龥]/g, "").slice(0, 12);
  return `${a}${r.year ?? ""}_${r.id.slice(0, 4)}`;
};
const BIB_TYPE: Record<RefType, string> = {
  article: "article", book: "book", chapter: "incollection", thesis: "phdthesis",
  report: "techreport", web: "online", other: "misc",
};
const RIS_TYPE: Record<RefType, string> = {
  article: "JOUR", book: "BOOK", chapter: "CHAP", thesis: "THES", report: "RPRT", web: "ELEC", other: "GEN",
};

export function readingToBibtex(r: Reading): string {
  const t = r.type ?? "other";
  const f: string[] = [];
  if (r.authors?.length) f.push(`author = {${r.authors.join(" and ")}}`);
  if (r.title) f.push(`title = {${r.title}}`);
  else f.push(`title = {${r.citation}}`);
  if (r.year) f.push(`year = {${r.year}}`);
  if (r.container) f.push(`${t === "chapter" || t === "book" ? "booktitle" : "journal"} = {${r.container}}`);
  if (r.publisher) f.push(`publisher = {${r.publisher}}`);
  if (r.volume) f.push(`volume = {${r.volume}}`);
  if (r.issue) f.push(`number = {${r.issue}}`);
  if (r.pages) f.push(`pages = {${r.pages.replace(/–/g, "--")}}`);
  if (r.doi) f.push(`doi = {${r.doi}}`);
  if (r.url) f.push(`url = {${r.url}}`);
  if (r.note) f.push(`note = {${r.note.replace(/\n+/g, " ")}}`);
  if (r.tags?.length) f.push(`keywords = {${r.tags.join(", ")}}`);
  return `@${BIB_TYPE[t]}{${bibKey(r)},\n  ${f.join(",\n  ")}\n}`;
}

export function readingToRis(r: Reading): string {
  const L = [`TY  - ${RIS_TYPE[r.type ?? "other"]}`];
  (r.authors ?? []).forEach((a) => L.push(`AU  - ${a}`));
  L.push(`TI  - ${r.title || r.citation}`);
  if (r.container) L.push(`T2  - ${r.container}`);
  if (r.year) L.push(`PY  - ${r.year}`);
  if (r.volume) L.push(`VL  - ${r.volume}`);
  if (r.issue) L.push(`IS  - ${r.issue}`);
  if (r.pages) {
    const [sp, ep] = r.pages.split(/[–-]/);
    if (sp) L.push(`SP  - ${sp.trim()}`);
    if (ep) L.push(`EP  - ${ep.trim()}`);
  }
  if (r.publisher) L.push(`PB  - ${r.publisher}`);
  if (r.doi) L.push(`DO  - ${r.doi}`);
  if (r.url) L.push(`UR  - ${r.url}`);
  if (r.note) L.push(`N1  - ${r.note.replace(/\n+/g, " ")}`);
  (r.tags ?? []).forEach((t) => L.push(`KW  - ${t}`));
  L.push("ER  - ");
  return L.join("\n");
}

export function exportReadings(list: Reading[], fmt: "bibtex" | "ris" | "apa" | "chicago" | "gbt"): string {
  if (fmt === "bibtex") return list.map(readingToBibtex).join("\n\n");
  if (fmt === "ris") return list.map(readingToRis).join("\n\n");
  return list.map((r) => formatCitation(r, fmt)).join("\n");
}

// ——— 导入解析 ———

const CR_TYPE: Record<string, RefType> = {
  "journal-article": "article", "proceedings-article": "article", book: "book", monograph: "book",
  "book-chapter": "chapter", "book-part": "chapter", dissertation: "thesis", report: "report", "posted-content": "article",
};

/** CrossRef work message → 结构化字段。 */
export function crossrefToReading(m: Record<string, unknown>): RefInput {
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
  const first = (v: unknown): string | undefined => (Array.isArray(v) && v.length ? String(v[0]) : undefined);
  const authors = (Array.isArray(m.author) ? m.author : [])
    .map((a: Record<string, unknown>) => {
      const fam = clean(a.family as string), giv = clean(a.given as string);
      return fam ? (giv ? `${fam}, ${giv}` : fam) : clean(a.name as string);
    })
    .filter(Boolean);
  const issued = (m.issued as { "date-parts"?: number[][] })?.["date-parts"]?.[0]?.[0]
    ?? (m.published as { "date-parts"?: number[][] })?.["date-parts"]?.[0]?.[0];
  const out: RefInput = {
    type: CR_TYPE[String(m.type)] ?? "article",
    authors: authors.length ? authors : undefined,
    title: first(m.title),
    container: first(m["container-title"]),
    publisher: clean(m.publisher as string) || undefined,
    volume: clean(m.volume as string) || undefined,
    issue: clean(m.issue as string) || undefined,
    pages: (clean(m.page as string) || "").replace(/-/g, "–") || undefined,
    doi: clean(m.DOI as string) || undefined,
    url: clean(m.URL as string) || undefined,
    year: issued ? String(issued) : undefined,
    tags: arr(m.subject).slice(0, 6) || undefined,
  };
  out.citation = composeCitation(out);
  return out;
}

const stripBraces = (v: string) =>
  v.trim().replace(/^[{"]+|[}"]+$/g, "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();

const BIB_FIELD: Record<string, keyof RefInput | "year"> = {
  title: "title", author: "authors", journal: "container", booktitle: "container",
  publisher: "publisher", school: "publisher", institution: "publisher",
  volume: "volume", number: "issue", pages: "pages", doi: "doi", url: "url", year: "year", keywords: "tags",
};
const BIB_ENTRY_TYPE: Record<string, RefType> = {
  article: "article", book: "book", booklet: "book", incollection: "chapter", inbook: "chapter",
  inproceedings: "article", conference: "article", phdthesis: "thesis", mastersthesis: "thesis",
  techreport: "report", online: "web", electronic: "web", misc: "other",
};

/** 解析一段（可含多条）BibTeX。 */
export function parseBibtex(text: string): RefInput[] {
  const out: RefInput[] = [];
  let i = 0;
  while (i < text.length) {
    const at = text.indexOf("@", i);
    if (at === -1) break;
    const brace = text.indexOf("{", at);
    if (brace === -1) break;
    const etype = text.slice(at + 1, brace).trim().toLowerCase();
    let depth = 0, end = -1;
    for (let j = brace; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}" && --depth === 0) { end = j; break; }
    }
    if (end === -1) break;
    const body = text.slice(brace + 1, end);
    i = end + 1;
    if (etype === "comment" || etype === "string" || etype === "preamble") continue;

    // 去掉 citekey，再按顶层逗号切字段
    const firstComma = body.indexOf(",");
    const rest = firstComma === -1 ? "" : body.slice(firstComma + 1);
    const parts: string[] = [];
    let d = 0, cur = "", q = false;
    for (const ch of rest) {
      if (ch === "{") d++;
      else if (ch === "}") d--;
      else if (ch === '"' && d === 0) q = !q;
      if (ch === "," && d === 0 && !q) { parts.push(cur); cur = ""; }
      else cur += ch;
    }
    if (cur.trim()) parts.push(cur);

    const ref: RefInput = { type: BIB_ENTRY_TYPE[etype] ?? "other" };
    for (const p of parts) {
      const eq = p.indexOf("=");
      if (eq === -1) continue;
      const key = p.slice(0, eq).trim().toLowerCase();
      const val = stripBraces(p.slice(eq + 1));
      const target = BIB_FIELD[key];
      if (!target || !val) continue;
      if (target === "authors") ref.authors = val.split(/\s+and\s+/i).map((a) => a.trim()).filter(Boolean);
      else if (target === "tags") ref.tags = val.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
      else if (target === "year") ref.year = (val.match(/\d{4}/) ?? [val])[0];
      else if (target === "pages") ref.pages = val.replace(/--/g, "–");
      else (ref as Record<string, string>)[target] = val;
    }
    ref.citation = composeCitation(ref);
    if (ref.citation) out.push(ref);
  }
  return out;
}

const RIS_TY: Record<string, RefType> = {
  JOUR: "article", BOOK: "book", CHAP: "chapter", THES: "thesis", RPRT: "report",
  ELEC: "web", WEB: "web", CONF: "article", CPAPER: "article", GEN: "other",
};

/** 解析一段（可含多条）RIS。 */
export function parseRis(text: string): RefInput[] {
  const out: RefInput[] = [];
  let cur: RefInput & { _sp?: string; _ep?: string } = {};
  let has = false;
  const flush = () => {
    if (has) {
      if (cur._sp || cur._ep) cur.pages = [cur._sp, cur._ep].filter(Boolean).join("–");
      delete cur._sp; delete cur._ep;
      cur.citation = composeCitation(cur);
      if (cur.citation) out.push(cur);
    }
    cur = {}; has = false;
  };
  for (const raw of text.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9])\s{0,2}-\s?(.*)$/.exec(raw.trim());
    if (!m) continue;
    const [, tag, val] = m;
    const v = val.trim();
    has = true;
    switch (tag) {
      case "TY": cur.type = RIS_TY[v] ?? "other"; break;
      case "AU": case "A1": case "A2": (cur.authors ??= []).push(v); break;
      case "TI": case "T1": cur.title = v; break;
      case "T2": case "JO": case "JF": case "J2": cur.container ??= v; break;
      case "PY": case "Y1": cur.year = (v.match(/\d{4}/) ?? [v])[0]; break;
      case "VL": cur.volume = v; break;
      case "IS": cur.issue = v; break;
      case "SP": cur._sp = v; break;
      case "EP": cur._ep = v; break;
      case "PB": cur.publisher = v; break;
      case "DO": cur.doi = v; break;
      case "UR": cur.url = v; break;
      case "KW": (cur.tags ??= []).push(v); break;
      case "ER": flush(); break;
    }
  }
  flush();
  return out;
}

/** 自动识别粘贴的文本是 BibTeX 还是 RIS，返回解析结果。 */
export function parseCitations(text: string): RefInput[] {
  const s = text.trim();
  if (!s) return [];
  if (/^\s*@\w+\s*\{/.test(s)) return parseBibtex(s);
  if (/^\s*(TY|PMID|A[U1])\s{0,2}-\s/m.test(s)) return parseRis(s);
  // 兜底：整段作为一条自由题录
  const year = s.match(/(19|20)\d{2}/)?.[0];
  return [{ citation: s.replace(/\s+/g, " ").trim(), year }];
}
