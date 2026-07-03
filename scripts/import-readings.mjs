// 把一份参考文献 .docx 导入为「已读文献」→ storage/readings.json
// 用法: node scripts/import-readings.mjs "<path-to.docx>"
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import mammoth from "mammoth";

const src = process.argv[2];
if (!src) { console.error("用法: node scripts/import-readings.mjs <参考文献.docx>"); process.exit(1); }

const OUT = path.join(process.cwd(), "storage", "readings.json");
const { value } = await mammoth.extractRawText({ path: src });
const lines = value.split("\n").map((s) => s.trim()).filter(Boolean)
  .filter((s) => !/^(bibliography|references|参考文献|works cited)$/i.test(s));

const existing = await fs.readFile(OUT, "utf8").then((t) => JSON.parse(t)).catch(() => []);
const seen = new Set(existing.map((r) => r.citation));
let added = 0;
for (const citation of lines) {
  if (citation.length < 12 || seen.has(citation)) continue; // 跳过过短/重复
  const ym = /\((\d{4})[a-z]?\)/.exec(citation) || /(\b(?:18|19|20)\d{2}\b)/.exec(citation);
  existing.push({
    id: crypto.randomUUID(),
    citation,
    year: ym ? ym[1] : undefined,
    tags: [],
    read: true,
    createdAt: new Date().toISOString(),
  });
  seen.add(citation);
  added++;
}

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(existing, null, 2));
console.log(`✓ 导入 ${added} 条文献，readings.json 共 ${existing.length} 条。`);
