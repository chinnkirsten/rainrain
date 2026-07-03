// 研究结构（阶段 + 子课题）的读写。用户可在应用内编辑 → storage/structure.json。
// 文件不存在时回退到内置默认（lib/phases 的 DEFAULT_PHASES）。
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_PHASES, type Phase } from "./phases";

const FILE = path.join(process.cwd(), "storage", "structure.json");

export async function loadPhases(): Promise<Phase[]> {
  try {
    const arr = JSON.parse(await fs.readFile(FILE, "utf8")) as Phase[];
    if (Array.isArray(arr) && arr.length) return arr;
  } catch {}
  return DEFAULT_PHASES;
}

export async function savePhases(phases: Phase[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(phases, null, 2), "utf8");
}
