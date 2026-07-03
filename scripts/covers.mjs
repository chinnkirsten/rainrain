// 为没有封面的 PDF 抓取首页作为书封缩略图（macOS：qlmanage + sips）。
// 本地馆藏 → storage/covers/<id>.jpg ；种子 → public/seed/covers/<id>.jpg
// 幂等：已有封面的跳过。用法： npm run covers
import { promises as fs } from "fs";
import path from "path";
import { renderCover } from "./cover-render.mjs";

const CWD = process.cwd();
const STORAGE = path.join(CWD, "storage");
const UPLOADS = path.join(STORAGE, "uploads");
const COVERS = path.join(STORAGE, "covers");
const CATALOG = path.join(STORAGE, "catalog.json");
const PUBLIC = path.join(CWD, "public");
const SEED_COVERS = path.join(PUBLIC, "seed", "covers");
const SEED_JSON = path.join(CWD, "data", "seed.json");

async function main() {
  let made = 0, skipped = 0, failed = 0;

  // 1) 本地馆藏
  let catalog = [];
  try {
    catalog = JSON.parse(await fs.readFile(CATALOG, "utf8"));
  } catch {}
  const pdfs = catalog.filter(
    (i) => i.kind === "pdf" && typeof i.src === "string" && i.src.startsWith("local:") && !i.cover,
  );
  if (pdfs.length) console.log(`本地馆藏：需生成封面 ${pdfs.length} 项…`);
  let n = 0;
  for (const item of pdfs) {
    n++;
    const srcFile = path.join(UPLOADS, item.src.slice("local:".length));
    const out = path.join(COVERS, `${item.id}.jpg`);
    if (await renderCover(srcFile, out)) {
      item.cover = `local:${item.id}.jpg`;
      made++;
    } else {
      failed++;
    }
    if (n % 10 === 0 || n === pdfs.length) process.stdout.write(`\r  进度 ${n}/${pdfs.length}`);
  }
  if (pdfs.length) process.stdout.write("\n");
  skipped += catalog.filter((i) => i.kind === "pdf" && i.cover).length;
  await fs.writeFile(CATALOG, JSON.stringify(catalog, null, 2)).catch(() => {});

  // 2) 种子
  let seed = [];
  try {
    seed = JSON.parse(await fs.readFile(SEED_JSON, "utf8"));
  } catch {}
  const seedPdfs = seed.filter(
    (i) => i.kind === "pdf" && typeof i.src === "string" && i.src.startsWith("/seed") && !i.cover,
  );
  if (seedPdfs.length) console.log(`种子：需生成封面 ${seedPdfs.length} 项…`);
  for (const item of seedPdfs) {
    const srcFile = path.join(PUBLIC, item.src);
    const out = path.join(SEED_COVERS, `${item.id}.jpg`);
    if (await renderCover(srcFile, out)) {
      item.cover = `/seed/covers/${item.id}.jpg`;
      made++;
    } else {
      failed++;
    }
  }
  if (seedPdfs.length) await fs.writeFile(SEED_JSON, JSON.stringify(seed, null, 2)).catch(() => {});

  console.log(`✓ 封面完成：新增 ${made}，已有 ${skipped}，失败 ${failed}。`);
}

main().catch((e) => {
  console.error("封面生成出错：", e.message);
  process.exit(1);
});
