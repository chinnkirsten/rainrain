// 抽取文档/PDF 正文，建全文索引（写到 storage/text/<id>.txt）。
// docx→mammoth；txt/md/csv→直接读；pdf→pdfjs（扫描件无文字层则为空，需 OCR，暂不处理）。
// 幂等：已抽取过的跳过；--force 重抽。用法： npm run index [--force]
import { promises as fs } from "fs";
import path from "path";
import mammoth from "mammoth";

const CWD = process.cwd();
const STORAGE = path.join(CWD, "storage");
const UPLOADS = path.join(STORAGE, "uploads");
const TEXT = path.join(STORAGE, "text");
const PUBLIC = path.join(CWD, "public");
const force = process.argv.includes("--force");

function fileOf(item) {
  if (typeof item.src !== "string") return null;
  if (item.src.startsWith("local:")) return path.join(UPLOADS, item.src.slice(6));
  if (item.src.startsWith("/seed")) return path.join(PUBLIC, item.src);
  return null; // http/blob 跳过
}

async function extractDocx(file) {
  const { value } = await mammoth.extractRawText({ path: file });
  return value || "";
}

async function extractPdf(file) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await fs.readFile(file));
  let doc;
  try {
    doc = await getDocument({
      data,
      useSystemFonts: true,
      isEvalSupported: false,
      verbosity: 0, // 静音 CJK cMap 警告
    }).promise;
  } catch {
    return ""; // 打不开 → 当作无文字
  }
  const pages = Math.min(doc.numPages, 150);
  let out = "";
  for (let p = 1; p <= pages; p++) {
    try {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      out += content.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
      page.cleanup();
    } catch {
      /* 跳过坏页 */
    }
  }
  try { await doc.destroy(); } catch {}
  return out;
}

async function extract(file, ext) {
  if (["docx", "doc"].includes(ext)) return extractDocx(file);
  if (["txt", "md", "csv", "tsv"].includes(ext)) return fs.readFile(file, "utf8").catch(() => "");
  if (ext === "pdf") return extractPdf(file);
  return null; // 其它类型不抽取
}

async function load(p) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return [];
  }
}

async function main() {
  await fs.mkdir(TEXT, { recursive: true });
  const items = [
    ...(await load(path.join(STORAGE, "catalog.json"))),
    ...(await load(path.join(CWD, "data", "seed.json"))),
  ];
  // 文本类优先，PDF 殿后（扫描件慢且常无文字）
  const prio = (k) => (k === "pdf" ? 1 : 0);
  items.sort((a, b) => prio(a.kind) - prio(b.kind));

  let done = 0, made = 0, empty = 0, skip = 0, fail = 0;
  for (const it of items) {
    done++;
    const ext = (it.filename?.split(".").pop() || "").toLowerCase();
    const out = path.join(TEXT, `${it.id}.txt`);
    if (!force) {
      try { await fs.access(out); skip++; continue; } catch {}
    }
    const file = fileOf(it);
    if (!file) { skip++; continue; }
    try {
      const text = await extract(file, ext);
      if (text == null) { skip++; continue; }
      await fs.writeFile(out, text);
      if (text.trim().length < 8) empty++;
      else made++;
    } catch {
      fail++;
    }
    if (done % 10 === 0 || done === items.length)
      process.stdout.write(`\r  进度 ${done}/${items.length}  已抽 ${made} 空 ${empty} 跳 ${skip} 失败 ${fail}`);
  }
  process.stdout.write("\n");
  console.log(`✓ 索引完成：有正文 ${made}，无文字层(可能扫描件) ${empty}，跳过 ${skip}，失败 ${fail}。`);
}

main().catch((e) => {
  console.error("索引出错：", e.message);
  process.exit(1);
});
