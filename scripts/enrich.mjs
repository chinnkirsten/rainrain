// 单条材料富化：上传后自动生成封面 + 抽取正文 + 扫描件 OCR。
// 由上传接口在后台调用：node scripts/enrich.mjs <itemId>
import { promises as fs } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import mammoth from "mammoth";
import { renderCover } from "./cover-render.mjs";

const exec = promisify(execFile);
const CWD = process.cwd();
const STORAGE = path.join(CWD, "storage");
const UPLOADS = path.join(STORAGE, "uploads");
const COVERS = path.join(STORAGE, "covers");
const TEXT = path.join(STORAGE, "text");
const CATALOG = path.join(STORAGE, "catalog.json");
const DONE = path.join(STORAGE, "ocr-done.json");
const OCRBIN = path.join(CWD, "scripts", "ocr-pdf");

const id = process.argv[2];
if (!id) { console.error("usage: node scripts/enrich.mjs <itemId>"); process.exit(1); }

const load = async (p, d = []) => { try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return d; } };
const fileOf = (it) => (it.src?.startsWith("local:") ? path.join(UPLOADS, it.src.slice(6)) : null);

async function extractPdf(file) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await fs.readFile(file));
  let doc;
  try { doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false, verbosity: 0 }).promise; }
  catch { return ""; }
  const pages = Math.min(doc.numPages, 150);
  let out = "";
  for (let p = 1; p <= pages; p++) {
    try { const pg = await doc.getPage(p); const c = await pg.getTextContent(); out += c.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n"; pg.cleanup(); } catch {}
  }
  try { await doc.destroy(); } catch {}
  return out;
}

async function extract(file, ext) {
  if (["docx", "doc"].includes(ext)) { const { value } = await mammoth.extractRawText({ path: file }); return value || ""; }
  if (["txt", "md", "csv", "tsv"].includes(ext)) return fs.readFile(file, "utf8").catch(() => "");
  if (ext === "pdf") return extractPdf(file);
  return null;
}

// 重新读目录写回某字段，降低与并发上传的覆盖风险
async function patchCatalog(itemId, patch) {
  const cat = await load(CATALOG);
  const it = cat.find((i) => i.id === itemId);
  if (!it) return;
  Object.assign(it, patch);
  await fs.writeFile(CATALOG, JSON.stringify(cat, null, 2)).catch(() => {});
}

async function main() {
  const item = (await load(CATALOG)).find((i) => i.id === id);
  if (!item) { console.error("item not found:", id); return; }
  const file = fileOf(item);
  if (!file) return;
  const ext = (item.filename?.split(".").pop() || "").toLowerCase();
  await fs.mkdir(TEXT, { recursive: true });

  // 1) 封面（PDF 抓首页，跨平台）
  if (item.kind === "pdf" && !item.cover) {
    if (await renderCover(file, path.join(COVERS, `${id}.jpg`))) {
      await patchCatalog(id, { cover: `local:${id}.jpg` });
    }
  }

  // 2) 抽取正文（建全文索引）
  let text = "";
  const txtPath = path.join(TEXT, `${id}.txt`);
  try {
    const t = await extract(file, ext);
    if (t != null) { text = t; await fs.writeFile(txtPath, t); }
  } catch {}

  // 3) 扫描件 OCR（PDF 且几乎无文字层）
  if (item.kind === "pdf" && text.trim().length < 40) {
    try { await fs.access(OCRBIN); }
    catch { try { await exec("swiftc", ["-O", path.join(CWD, "scripts", "ocr-pdf.swift"), "-o", OCRBIN]); } catch { console.log("ocr skip (no swiftc)"); return; } }
    try {
      const { stdout } = await exec(OCRBIN, [file, "300"], { maxBuffer: 128 * 1024 * 1024 });
      if (stdout.trim().length > 0) await fs.writeFile(txtPath, stdout);
    } catch {}
    const done = new Set(await load(DONE));
    done.add(id);
    await fs.writeFile(DONE, JSON.stringify([...done])).catch(() => {});
  }
  console.log("enriched", id);
}

main().catch((e) => { console.error("enrich error:", e.message); process.exit(1); });
