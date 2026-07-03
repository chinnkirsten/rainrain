// 研究日志：分析型备忘 + 反身性笔记 + 自动记录的决策轨迹。
// 双模式存储（Vercel Blob / 本地磁盘），镜像 lib/notes。仓库为空时回退到示例。
import { promises as fs } from "fs";
import path from "path";
import { put, list } from "@vercel/blob";
import type { LogEntry, LogKind } from "./types";
import seedLog from "@/data/seed-research-log.json";

function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
const LOCAL = path.join(STORAGE_DIR, "research-log.json");
const BLOB = "catalog/research-log.json";

async function readStore(): Promise<LogEntry[]> {
  if (blobConfigured()) {
    try {
      const { blobs } = await list({ prefix: BLOB, limit: 1 });
      const f = blobs.find((b) => b.pathname === BLOB);
      if (!f) return [];
      const res = await fetch(f.url, { cache: "no-store" });
      return res.ok ? ((await res.json()) as LogEntry[]) : [];
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL, "utf8")) as LogEntry[];
  } catch {
    return [];
  }
}

async function writeStore(entries: LogEntry[]): Promise<void> {
  if (blobConfigured()) {
    await put(BLOB, JSON.stringify(entries, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(LOCAL, JSON.stringify(entries, null, 2), "utf8");
}

// 读路径：仓库为空时回退到内置示例（演示用；用户一旦自己新增，示例即隐去）。最新在前。
export async function getLog(): Promise<LogEntry[]> {
  const stored = await readStore();
  const entries = stored.length ? stored : (seedLog as LogEntry[]);
  return [...entries].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
}

export async function addLogEntry(kind: LogKind, body: string): Promise<LogEntry> {
  const entry: LogEntry = { id: crypto.randomUUID(), at: new Date().toISOString(), kind, body };
  const all = await readStore();
  all.unshift(entry);
  await writeStore(all);
  return entry;
}

export async function deleteLogEntry(id: string): Promise<boolean> {
  const all = await readStore();
  const next = all.filter((x) => x.id !== id);
  if (next.length === all.length) return false;
  await writeStore(next);
  return true;
}

/** 系统自动记录一条决策轨迹。永不因日志失败而中断触发它的操作。 */
export async function logEvent(body: string): Promise<void> {
  try {
    await addLogEntry("auto", body);
  } catch {
    /* 记日志失败不影响主操作 */
  }
}
