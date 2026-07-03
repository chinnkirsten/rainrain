// 匿名化映射（真名 → 代号）的本地存储。仅本地磁盘（云预览为只读）。
import { promises as fs } from "fs";
import path from "path";
import type { AnonPair } from "./anon-util";

const FILE = path.join(process.cwd(), "storage", "anon-map.json");

export async function getAnonMap(): Promise<AnonPair[]> {
  try {
    const arr = JSON.parse(await fs.readFile(FILE, "utf8")) as AnonPair[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveAnonMap(pairs: AnonPair[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(pairs, null, 2), "utf8");
}
