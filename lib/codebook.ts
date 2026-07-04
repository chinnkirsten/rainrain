// 编码本：每个码（标签）的定义与层级（父码）。双模式存储，镜像 lib/research-log。
import { promises as fs } from "fs";
import path from "path";
import { put, list } from "@vercel/blob";

export type CodeDef = {
  tag: string;
  definition?: string;
  parent?: string;
};

function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
const LOCAL = path.join(STORAGE_DIR, "codebook.json");
const BLOB = "catalog/codebook.json";

export async function getCodebook(): Promise<CodeDef[]> {
  if (blobConfigured()) {
    try {
      const { blobs } = await list({ prefix: BLOB, limit: 1 });
      const f = blobs.find((b) => b.pathname === BLOB);
      if (!f) return [];
      const res = await fetch(f.url, { cache: "no-store" });
      return res.ok ? ((await res.json()) as CodeDef[]) : [];
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL, "utf8")) as CodeDef[];
  } catch {
    return [];
  }
}

export async function saveCodebook(defs: CodeDef[]): Promise<void> {
  if (blobConfigured()) {
    await put(BLOB, JSON.stringify(defs, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(LOCAL, JSON.stringify(defs, null, 2), "utf8");
}
