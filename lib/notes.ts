import { promises as fs } from "fs";
import path from "path";
import { put, list } from "@vercel/blob";
import type { Note } from "./types";
import seedNotes from "@/data/seed-notes.json";

function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
const LOCAL_NOTES = path.join(STORAGE_DIR, "notes.json");
const NOTES_BLOB = "catalog/notes.json";

async function readStore(): Promise<Note[]> {
  if (blobConfigured()) {
    try {
      const { blobs } = await list({ prefix: NOTES_BLOB, limit: 1 });
      const f = blobs.find((b) => b.pathname === NOTES_BLOB);
      if (!f) return [];
      const res = await fetch(f.url, { cache: "no-store" });
      return res.ok ? ((await res.json()) as Note[]) : [];
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL_NOTES, "utf8")) as Note[];
  } catch {
    return [];
  }
}

async function writeStore(notes: Note[]): Promise<void> {
  if (blobConfigured()) {
    await put(NOTES_BLOB, JSON.stringify(notes, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(LOCAL_NOTES, JSON.stringify(notes, null, 2), "utf8");
}

// 读路径：仓库为空时回退到内置示例（演示用；用户一旦自己新增，示例即隐去）
export async function getNotes(): Promise<Note[]> {
  const stored = await readStore();
  return stored.length ? stored : (seedNotes as Note[]);
}

export async function addNote(n: Note): Promise<Note> {
  const all = await readStore();
  all.unshift(n);
  await writeStore(all);
  return n;
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<Note, "title" | "body">>,
): Promise<Note | null> {
  const all = await readStore();
  let idx = all.findIndex((x) => x.id === id);
  if (idx === -1) {
    // 在编辑示例笔记：把它“提升”为可写的真实笔记
    const seed = (seedNotes as Note[]).find((s) => s.id === id);
    if (!seed) return null;
    all.unshift({ ...seed });
    idx = 0;
  }
  all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  await writeStore(all);
  return all[idx];
}

export async function deleteNote(id: string): Promise<boolean> {
  const all = await readStore();
  const next = all.filter((x) => x.id !== id);
  if (next.length === all.length) return false;
  await writeStore(next);
  return true;
}

/** 从正文里抽取所有 [[链接]] 目标（去重、去空白）。 */
export function parseLinks(body: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const t = m[1].trim();
    if (t) out.push(t);
  }
  return [...new Set(out)];
}
