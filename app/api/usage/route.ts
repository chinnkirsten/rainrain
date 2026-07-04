import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

// 资料库占用：递归统计 storage/ 大小。云端 Blob 模式没有本地目录 → bytes: null。
async function dirSize(dir: string): Promise<number> {
  let total = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += await dirSize(p);
    else if (e.isFile()) total += (await fs.stat(p)).size;
  }
  return total;
}

export async function GET() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ bytes: null });
  const dir = process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
  try {
    return NextResponse.json({ bytes: await dirSize(dir) });
  } catch {
    return NextResponse.json({ bytes: 0 });
  }
}
