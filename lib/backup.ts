import { createWriteStream, promises as fs } from "fs";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const BACKUP_DIR = path.join(STORAGE_DIR, "backups");

export function isLocalMode(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN;
}

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

// archiver v8 is pure ESM exporting classes (no callable factory, no usable @types);
// load ZipArchive at runtime with a minimal local shape.
type ZipArchiveLike = {
  pipe(dest: NodeJS.WritableStream): void;
  on(event: string, cb: (err?: unknown) => void): void;
  glob(pattern: string, options?: Record<string, unknown>): void;
  finalize(): void;
};

/** 把整个 storage/（除 backups/ 外）打包成带时间戳的 zip，写入 storage/backups/。 */
export async function createBackup(now: Date): Promise<{ file: string; size: number }> {
  const mod = (await import("archiver")) as unknown as {
    ZipArchive: new (options?: Record<string, unknown>) => ZipArchiveLike;
  };

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const name = `rainrain-backup-${stamp(now)}.zip`;
  const outPath = path.join(BACKUP_DIR, name);

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outPath);
    // 多为已压缩的 PDF/图片，用低压缩级换取速度（体积差异极小）
    const archive = new mod.ZipArchive({ zlib: { level: 1 } });
    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);
    archive.glob("**/*", { cwd: STORAGE_DIR, ignore: ["backups/**"], dot: true });
    archive.finalize();
  });

  const st = await fs.stat(outPath);
  return { file: path.relative(process.cwd(), outPath), size: st.size };
}
