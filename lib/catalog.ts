import { promises as fs } from "fs";
import path from "path";
import { put, list, del } from "@vercel/blob";
import type { Excerpt, Reading, ResearchItem } from "./types";
import seedData from "@/data/seed.json";
import seedEvidence from "@/data/seed-evidence.json";
import seedReadings from "@/data/seed-readings.json";
import { LANG } from "./i18n";
import { logEvent } from "./research-log";

const CATALOG_PATH = "catalog/index.json";

/**
 * 存储模式：
 * - 有 BLOB_READ_WRITE_TOKEN（部署在 Vercel）→ 云存储（Vercel Blob）
 * - 没有（本地自托管）→ 本地磁盘存储（storage/ 目录，资料不出本机）
 */
export function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ---- 本地磁盘存储路径 ----
const STORAGE_DIR =
  process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
const UPLOADS_DIR = path.join(STORAGE_DIR, "uploads");
const COVERS_DIR = path.join(STORAGE_DIR, "covers");
const LOCAL_CATALOG = path.join(STORAGE_DIR, "catalog.json");

export function uploadsDir(): string {
  return UPLOADS_DIR;
}

export function coversDir(): string {
  return COVERS_DIR;
}

export async function ensureStorage(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export function getSeedItems(): ResearchItem[] {
  return (seedData as ResearchItem[]) ?? [];
}

// ---------- 读 ----------
async function readUploadCatalog(): Promise<ResearchItem[]> {
  if (blobConfigured()) {
    try {
      const { blobs } = await list({ prefix: CATALOG_PATH, limit: 1 });
      const found = blobs.find((b) => b.pathname === CATALOG_PATH);
      if (!found) return [];
      const res = await fetch(found.url, { cache: "no-store" });
      if (!res.ok) return [];
      return (await res.json()) as ResearchItem[];
    } catch {
      return [];
    }
  }
  // 本地
  try {
    const raw = await fs.readFile(LOCAL_CATALOG, "utf8");
    return JSON.parse(raw) as ResearchItem[];
  } catch {
    return [];
  }
}

// ---------- 写 ----------
async function writeUploadCatalog(items: ResearchItem[]): Promise<void> {
  if (blobConfigured()) {
    await put(CATALOG_PATH, JSON.stringify(items, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await ensureStorage();
  await fs.writeFile(LOCAL_CATALOG, JSON.stringify(items, null, 2), "utf8");
}

export async function getAllItems(): Promise<ResearchItem[]> {
  const uploads = await readUploadCatalog();
  // 被编辑/删除过的种子已“提升”进 uploads（含墓碑），此处以 uploads 为准，避免重复或复活
  const overridden = new Set(uploads.map((u) => u.id));
  return [
    ...uploads.filter((i) => !i.deletedAt),
    ...getSeedItems().filter((s) => !overridden.has(s.id)),
  ];
}

export async function getItemById(id: string): Promise<ResearchItem | null> {
  const all = await getAllItems();
  return all.find((i) => i.id === id) ?? null;
}

export async function addItem(item: ResearchItem): Promise<void> {
  const uploads = await readUploadCatalog();
  uploads.unshift(item);
  await writeUploadCatalog(uploads);
}

export async function updateItem(
  id: string,
  patch: Partial<
    Pick<
      ResearchItem,
      | "title" | "description" | "year" | "phase" | "tags"
      | "author" | "publisher" | "archive" | "callNumber" | "edition"
    >
  >,
): Promise<ResearchItem | null> {
  const uploads = await readUploadCatalog();
  let idx = uploads.findIndex((i) => i.id === id);
  if (idx === -1) {
    // 种子内容：首次编辑时提升为可管理的目录项（保留 /seed 资源路径，图片仍可显示）
    const seed = getSeedItems().find((s) => s.id === id);
    if (!seed) return null;
    uploads.unshift({ ...seed, seed: false });
    idx = 0;
  }
  uploads[idx] = { ...uploads[idx], ...patch };
  await writeUploadCatalog(uploads);
  return uploads[idx];
}

// ---------- 标签管理（重命名 / 删除，作用于所有条目）----------
function applyTag(tags: string[] | undefined, from: string, to: string): string[] {
  const out: string[] = [];
  for (const t of tags ?? []) {
    const nt = t === from ? to : t;
    if (nt && !out.includes(nt)) out.push(nt);
  }
  return out;
}
/** 把标签 from 改为 to（to 为空则删除该标签）；作用于全部条目（含种子，首次改动会提升种子）。返回受影响条目数。 */
export async function renameTag(from: string, to: string): Promise<number> {
  from = from.trim();
  to = to.trim();
  if (!from) return 0;
  const uploads = await readUploadCatalog();
  const overridden = new Set(uploads.map((u) => u.id));
  let changed = 0;
  for (const u of uploads) {
    if (u.tags?.includes(from)) {
      u.tags = applyTag(u.tags, from, to);
      changed++;
    }
  }
  for (const s of getSeedItems()) {
    if (!overridden.has(s.id) && s.tags?.includes(from)) {
      uploads.unshift({ ...s, seed: false, tags: applyTag(s.tags, from, to) });
      changed++;
    }
  }
  if (changed) {
    await writeUploadCatalog(uploads);
    const msg = !to
      ? LANG === "zh"
        ? `删除标签「${from}」，从 ${changed} 条材料移除`
        : `Deleted tag “${from}” — removed from ${changed} item(s)`
      : LANG === "zh"
        ? `标签「${from}」→「${to}」（${changed} 条材料）`
        : `Renamed tag “${from}” → “${to}” (${changed} item(s))`;
    await logEvent(msg);
  }
  return changed;
}

/** 软删除：移入回收站（保留底层文件，可还原）。种子内容也支持，提升后软删。 */
export async function deleteItem(id: string): Promise<ResearchItem | null> {
  const uploads = await readUploadCatalog();
  const now = new Date().toISOString();
  const idx = uploads.findIndex((i) => i.id === id);
  if (idx === -1) {
    const seed = getSeedItems().find((s) => s.id === id);
    if (!seed) return null;
    const promoted: ResearchItem = { ...seed, seed: false, deletedAt: now };
    uploads.unshift(promoted);
    await writeUploadCatalog(uploads);
    return promoted;
  }
  uploads[idx] = { ...uploads[idx], deletedAt: now };
  await writeUploadCatalog(uploads);
  return uploads[idx];
}

/** 回收站列表（已软删除项，按删除时间倒序；不含已彻底清除的种子墓碑） */
export async function getTrashItems(): Promise<ResearchItem[]> {
  const uploads = await readUploadCatalog();
  return uploads
    .filter((i) => i.deletedAt && !i.purgedSeed)
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

/** 从回收站还原 */
export async function restoreItem(id: string): Promise<ResearchItem | null> {
  const uploads = await readUploadCatalog();
  const idx = uploads.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const next = { ...uploads[idx] };
  delete next.deletedAt;
  uploads[idx] = next;
  await writeUploadCatalog(uploads);
  return uploads[idx];
}

async function purgeFiles(item: ResearchItem) {
  try {
    if (item.src?.startsWith("http")) await del(item.src);
    else if (item.src?.startsWith("local:"))
      await fs.unlink(path.join(UPLOADS_DIR, item.src.slice("local:".length)));
  } catch {}
  try {
    if (item.cover?.startsWith("local:"))
      await fs.unlink(path.join(COVERS_DIR, item.cover.slice("local:".length)));
  } catch {}
  try {
    await fs.unlink(path.join(STORAGE_DIR, "text", `${item.id}.txt`));
  } catch {}
}

/** 彻底删除单项（移除目录项 + 底层文件）。种子来源保留墓碑，防止 getSeedItems 复活。 */
export async function purgeItem(id: string): Promise<ResearchItem | null> {
  const uploads = await readUploadCatalog();
  const idx = uploads.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const item = uploads[idx];
  if (item.src?.startsWith("/seed")) {
    uploads[idx] = { ...item, purgedSeed: true, deletedAt: item.deletedAt ?? new Date().toISOString() };
    await writeUploadCatalog(uploads);
    return item;
  }
  uploads.splice(idx, 1);
  await writeUploadCatalog(uploads);
  await purgeFiles(item);
  return item;
}

/** 清空回收站（彻底删除所有已软删除项；种子来源留墓碑） */
export async function emptyTrash(): Promise<number> {
  const uploads = await readUploadCatalog();
  const trashed = uploads.filter((i) => i.deletedAt && !i.purgedSeed);
  if (!trashed.length) return 0;
  const trashedIds = new Set(trashed.map((t) => t.id));
  const next: ResearchItem[] = [];
  for (const it of uploads) {
    if (!trashedIds.has(it.id)) {
      next.push(it);
    } else if (it.src?.startsWith("/seed")) {
      next.push({ ...it, purgedSeed: true }); // 种子墓碑
    } else {
      await purgeFiles(it); // 真实文件：彻底删除
    }
  }
  await writeUploadCatalog(next);
  return trashed.length;
}

/**
 * 对客户端安全的形式：种子文件保留 /seed 静态路径；上传文件（云或本地）
 * 一律经 /api/file/<id> 鉴权代理，不暴露底层地址。
 */
// ---------- 收藏 ----------
const FAV_BLOB = "catalog/favorites.json";
const LOCAL_FAV = path.join(STORAGE_DIR, "favorites.json");

export async function getFavorites(): Promise<string[]> {
  if (blobConfigured()) {
    try {
      const { blobs } = await list({ prefix: FAV_BLOB, limit: 1 });
      const f = blobs.find((b) => b.pathname === FAV_BLOB);
      if (!f) return [];
      const res = await fetch(f.url, { cache: "no-store" });
      return res.ok ? ((await res.json()) as string[]) : [];
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL_FAV, "utf8")) as string[];
  } catch {
    return [];
  }
}

export async function setFavorite(id: string, value: boolean): Promise<string[]> {
  const set = new Set(await getFavorites());
  if (value) set.add(id);
  else set.delete(id);
  const ids = [...set];
  if (blobConfigured()) {
    await put(FAV_BLOB, JSON.stringify(ids), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    await ensureStorage();
    await fs.writeFile(LOCAL_FAV, JSON.stringify(ids), "utf8");
  }
  return ids;
}

// ---------- 证据库 ----------
const EVID_BLOB = "catalog/evidence.json";
const LOCAL_EVID = path.join(STORAGE_DIR, "evidence.json");

async function readEvidenceStore(): Promise<Excerpt[]> {
  if (blobConfigured()) {
    try {
      const { blobs } = await list({ prefix: EVID_BLOB, limit: 1 });
      const f = blobs.find((b) => b.pathname === EVID_BLOB);
      if (!f) return [];
      const res = await fetch(f.url, { cache: "no-store" });
      return res.ok ? ((await res.json()) as Excerpt[]) : [];
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL_EVID, "utf8")) as Excerpt[];
  } catch {
    return [];
  }
}

// 读路径：仓库为空时回退到内置示例（演示用；用户一旦自己新增，示例即隐去）
export async function getEvidence(): Promise<Excerpt[]> {
  const stored = await readEvidenceStore();
  return stored.length ? stored : (seedEvidence as Excerpt[]);
}

async function writeEvidence(list_: Excerpt[]): Promise<void> {
  if (blobConfigured()) {
    await put(EVID_BLOB, JSON.stringify(list_, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await ensureStorage();
  await fs.writeFile(LOCAL_EVID, JSON.stringify(list_, null, 2), "utf8");
}

export async function addEvidence(e: Excerpt): Promise<Excerpt> {
  const all = await readEvidenceStore();
  all.unshift(e);
  await writeEvidence(all);
  return e;
}

export async function updateEvidence(
  id: string,
  patch: Partial<Pick<Excerpt, "quote" | "note" | "tags" | "page">>,
): Promise<Excerpt | null> {
  const all = await readEvidenceStore();
  const idx = all.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  await writeEvidence(all);
  return all[idx];
}

export async function deleteEvidence(id: string): Promise<boolean> {
  const all = await readEvidenceStore();
  const next = all.filter((x) => x.id !== id);
  if (next.length === all.length) return false;
  await writeEvidence(next);
  return true;
}

// ---------- 已读文献（二手研究书目） ----------
const READINGS_BLOB = "catalog/readings.json";
const LOCAL_READINGS = path.join(STORAGE_DIR, "readings.json");

async function readReadingsStore(): Promise<Reading[]> {
  if (blobConfigured()) {
    try {
      const { blobs } = await list({ prefix: READINGS_BLOB, limit: 1 });
      const f = blobs.find((b) => b.pathname === READINGS_BLOB);
      if (!f) return [];
      const res = await fetch(f.url, { cache: "no-store" });
      return res.ok ? ((await res.json()) as Reading[]) : [];
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL_READINGS, "utf8")) as Reading[];
  } catch {
    return [];
  }
}

// 读路径：仓库为空时回退到内置示例（演示用；用户一旦自己新增，示例即隐去）
export async function getReadings(): Promise<Reading[]> {
  const stored = await readReadingsStore();
  return stored.length ? stored : (seedReadings as Reading[]);
}

async function writeReadings(list_: Reading[]): Promise<void> {
  if (blobConfigured()) {
    await put(READINGS_BLOB, JSON.stringify(list_, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await ensureStorage();
  await fs.writeFile(LOCAL_READINGS, JSON.stringify(list_, null, 2), "utf8");
}

export async function addReading(r: Reading): Promise<Reading> {
  const all = await readReadingsStore();
  all.unshift(r);
  await writeReadings(all);
  return r;
}

export async function updateReading(
  id: string,
  patch: Partial<Pick<Reading, "citation" | "year" | "tags" | "note" | "read" | "phase">>,
): Promise<Reading | null> {
  const all = await readReadingsStore();
  const idx = all.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  await writeReadings(all);
  return all[idx];
}

export async function deleteReading(id: string): Promise<boolean> {
  const all = await readReadingsStore();
  const next = all.filter((x) => x.id !== id);
  if (next.length === all.length) return false;
  await writeReadings(next);
  return true;
}

export function toPublicItem(item: ResearchItem): ResearchItem {
  const out: ResearchItem = { ...item };
  if (!(item.seed || item.src.startsWith("/seed"))) {
    out.src = `/api/file/${item.id}`;
  }
  if (item.cover) {
    out.cover = item.cover.startsWith("local:")
      ? `/api/cover/${item.id}`
      : item.cover;
  }
  return out;
}
