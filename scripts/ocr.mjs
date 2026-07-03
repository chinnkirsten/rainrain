// 对扫描版 PDF（无文字层）做 Vision OCR，写入 storage/text/<id>.txt，让书籍正文可搜。
// 可断点续跑（storage/ocr-done.json 记录已处理）。小文件优先。
// 用法: npm run ocr [--pages=300]
import { promises as fs } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);
const CWD = process.cwd();
const STORAGE = path.join(CWD, "storage");
const UPLOADS = path.join(STORAGE, "uploads");
const TEXT = path.join(STORAGE, "text");
const PUBLIC = path.join(CWD, "public");
const DONE = path.join(STORAGE, "ocr-done.json");
const BIN = path.join(CWD, "scripts", "ocr-pdf");
const MAXPAGES = (process.argv.find((a) => a.startsWith("--pages=")) || "").split("=")[1] || "300";

const fileOf = (it) =>
  it.src?.startsWith("local:")
    ? path.join(UPLOADS, it.src.slice(6))
    : it.src?.startsWith("/seed")
      ? path.join(PUBLIC, it.src)
      : null;
const load = async (p) => {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return [];
  }
};

async function main() {
  // 首次运行自动编译 Swift OCR 程序（需 macOS 的 swiftc）
  try {
    await fs.access(BIN);
  } catch {
    console.log("首次运行：编译 OCR 程序…");
    try {
      await exec("swiftc", ["-O", path.join(CWD, "scripts", "ocr-pdf.swift"), "-o", BIN]);
    } catch {
      console.error(
        "无法编译 OCR 程序。需要 macOS 与 Xcode 命令行工具：先运行 `xcode-select --install`，再重试 `npm run ocr`。",
      );
      process.exit(1);
    }
  }
  await fs.mkdir(TEXT, { recursive: true });

  const items = [
    ...(await load(path.join(STORAGE, "catalog.json"))),
    ...(await load(path.join(CWD, "data", "seed.json"))),
  ];
  const doneArr = await load(DONE);
  const done = new Set(Array.isArray(doneArr) ? doneArr : []);

  const targets = [];
  for (const it of items) {
    if (it.kind !== "pdf" || done.has(it.id)) continue;
    const f = fileOf(it);
    if (!f) continue;
    let txt = "";
    try { txt = await fs.readFile(path.join(TEXT, `${it.id}.txt`), "utf8"); } catch {}
    if (txt.trim().length > 40) { done.add(it.id); continue; } // 已有文字层
    try { await fs.access(f); } catch { continue; }
    targets.push({ it, f, size: (await fs.stat(f)).size });
  }
  targets.sort((a, b) => a.size - b.size); // 小文件先

  console.log(`需 OCR 的扫描书：${targets.length} 本（每本最多 ${MAXPAGES} 页）。可随时 Ctrl+C，下次续跑。`);
  let n = 0;
  for (const { it, f } of targets) {
    n++;
    try {
      const { stdout } = await exec(BIN, [f, MAXPAGES], { maxBuffer: 128 * 1024 * 1024 });
      await fs.writeFile(path.join(TEXT, `${it.id}.txt`), stdout);
      console.log(`  [${n}/${targets.length}] ✓ ${(it.title || "").slice(0, 28)} — ${stdout.trim().length} 字`);
    } catch (e) {
      console.log(`  [${n}/${targets.length}] ✗ ${(it.title || "").slice(0, 28)} — ${String(e.message).slice(0, 40)}`);
    }
    done.add(it.id);
    await fs.writeFile(DONE, JSON.stringify([...done]));
  }
  console.log("✓ OCR 完成。");
}

main().catch((e) => { console.error("OCR 出错：", e.message); process.exit(1); });
