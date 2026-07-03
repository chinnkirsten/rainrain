// 批量把一个本地文件夹导入研究图书馆（仅本地磁盘存储模式）。
// 用法:
//   node scripts/import.mjs "<源文件夹>" --phase <阶段id> [--tags a,b] [--only pdf,docx,...]
// 例:
//   node scripts/import.mjs "~/Desktop/manchukuo/01_史料文献" --phase manchukuo --tags 史料文献 --only pdf,docx
//
// 行为：递归复制文件到 storage/uploads/，并写入 storage/catalog.json。
// 文件所在的「直接子目录名」会自动作为标签（顶层文件除外）。
// 自动跳过：0 字节文件、.part 未完成下载、隐藏文件。
// --only 只导入指定扩展名；阶段 id：undergrad | master | phd | manchukuo

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const VALID_PHASES = ["undergrad", "master", "phd", "manchukuo"];

const MIME = {
  m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac",
  ogg: "audio/ogg", flac: "audio/flac", m4b: "audio/mp4",
  mp4: "video/mp4", mov: "video/quicktime", m4v: "video/mp4", webm: "video/webm",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", tif: "image/tiff", tiff: "image/tiff", jp2: "image/jp2",
  txt: "text/plain", md: "text/markdown", csv: "text/csv",
  json: "application/json", geojson: "application/json",
};

function kindOf(ext) {
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "tif", "tiff", "bmp", "heic"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx", "rtf", "odt", "pages", "md", "txt"].includes(ext)) return "doc";
  if (["ppt", "pptx", "key"].includes(ext)) return "slides";
  if (["xls", "xlsx", "xlsm", "csv", "tsv", "numbers"].includes(ext)) return "sheet";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (["m4a", "mp3", "wav", "aac", "ogg", "flac", "m4b", "aiff", "wma"].includes(ext)) return "audio";
  if (["mp4", "mov", "m4v", "webm", "avi", "mkv"].includes(ext)) return "video";
  if (["geojson", "json", "kml", "kmz", "shp", "gpkg", "pbf", "gml", "xml"].includes(ext)) return "data";
  return "other";
}

const titleFrom = (f) => f.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim() || f;
const yearFrom = (f) => (f.match(/(19|20)\d{2}/) || [])[0];

// ---- 解析参数 ----
const argv = process.argv.slice(2);
let src = null, phase = null, baseTags = [], onlyExts = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--phase") phase = argv[++i];
  else if (a === "--tags") baseTags = (argv[++i] || "").split(",").map((t) => t.trim()).filter(Boolean);
  else if (a === "--only") onlyExts = new Set((argv[++i] || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean));
  else if (!src) src = a;
}
if (src?.startsWith("~")) src = src.replace("~", process.env.HOME);

if (!src || !phase) {
  console.error('用法: node scripts/import.mjs "<源文件夹>" --phase <阶段id> [--tags a,b] [--only pdf,docx]');
  process.exit(1);
}
if (!VALID_PHASES.includes(phase)) {
  console.error(`阶段 id 无效。可选: ${VALID_PHASES.join(" | ")}`);
  process.exit(1);
}

const STORAGE = path.join(process.cwd(), "storage");
const UPLOADS = path.join(STORAGE, "uploads");
const CATALOG = path.join(STORAGE, "catalog.json");

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function main() {
  const stat = await fs.stat(src).catch(() => null);
  if (!stat?.isDirectory()) {
    console.error(`找不到文件夹: ${src}`);
    process.exit(1);
  }
  const srcRoot = path.resolve(src);
  await fs.mkdir(UPLOADS, { recursive: true });

  let catalog = [];
  try {
    catalog = JSON.parse(await fs.readFile(CATALOG, "utf8"));
  } catch {}

  const files = await walk(src);
  console.log(`扫描到 ${files.length} 个文件，开始筛选并导入到「${phase}」…`);

  const added = [];
  let skipped = 0, done = 0;
  for (const file of files) {
    const base = path.basename(file);
    const ext = (base.split(".").pop() || "").toLowerCase();
    const size = (await fs.stat(file)).size;

    if (size === 0 || ext === "part") { skipped++; continue; }
    if (onlyExts && !onlyExts.has(ext)) { skipped++; continue; }

    const isNested = path.resolve(path.dirname(file)) !== srcRoot;
    const subTag = isNested ? path.basename(path.dirname(file)) : null;
    const id = randomUUID();
    const safe = base.replace(/[/\\]/g, "_");
    const diskName = `${id}__${safe}`;

    await fs.copyFile(file, path.join(UPLOADS, diskName));

    const tags = [...new Set([...baseTags, subTag].filter(Boolean))];
    added.push({
      id, phase,
      title: titleFrom(base),
      year: yearFrom(base),
      kind: kindOf(ext),
      src: `local:${diskName}`,
      mime: MIME[ext] || undefined,
      filename: safe,
      size,
      createdAt: new Date().toISOString(),
      tags,
    });
    done++;
    if (done % 10 === 0 || done === files.length) process.stdout.write(`\r  已导入 ${done} 项`);
  }
  process.stdout.write("\n");

  const next = [...added, ...catalog];
  await fs.writeFile(CATALOG, JSON.stringify(next, null, 2));
  console.log(`✓ 完成：新增 ${added.length} 项，跳过 ${skipped} 项，馆藏共 ${next.length} 项（不含种子）。`);
  console.log(`  文件已复制到 ${UPLOADS}`);
}

main().catch((e) => {
  console.error("导入失败:", e.message);
  process.exit(1);
});
