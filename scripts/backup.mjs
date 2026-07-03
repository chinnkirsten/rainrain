// 一键备份（命令行版）：把 storage/ 打包到 storage/backups/rainrain-backup-<时间>.zip
import { ZipArchive } from "archiver";
import { createWriteStream, promises as fs } from "fs";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const BACKUP_DIR = path.join(STORAGE_DIR, "backups");

const p = (n) => String(n).padStart(2, "0");
const d = new Date();
const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;

await fs.mkdir(BACKUP_DIR, { recursive: true });
const outPath = path.join(BACKUP_DIR, `rainrain-backup-${stamp}.zip`);

await new Promise((resolve, reject) => {
  const output = createWriteStream(outPath);
  const archive = new ZipArchive({ zlib: { level: 1 } });
  output.on("close", resolve);
  archive.on("error", reject);
  archive.on("warning", (w) => console.warn(w.message));
  archive.pipe(output);
  archive.glob("**/*", { cwd: STORAGE_DIR, ignore: ["backups/**"], dot: true });
  archive.finalize();
});

const st = await fs.stat(outPath);
console.log(`✓ 已备份 → ${path.relative(process.cwd(), outPath)}  (${(st.size / 1024 / 1024).toFixed(1)} MB)`);
