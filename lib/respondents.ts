import { promises as fs } from "fs";
import path from "path";
import { put, list } from "@vercel/blob";
import type { RespondentProject, Respondent } from "./types";
import seedProjects from "@/data/seed-respondent-projects.json";
import seedRespondents from "@/data/seed-respondents.json";

function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
const LOCAL_PROJ = path.join(STORAGE_DIR, "respondent-projects.json");
const LOCAL_RESP = path.join(STORAGE_DIR, "respondents.json");
const PROJ_BLOB = "catalog/respondent-projects.json";
const RESP_BLOB = "catalog/respondents.json";

async function readStore<T>(localPath: string, blobName: string): Promise<T[]> {
  if (blobConfigured()) {
    try {
      const { blobs } = await list({ prefix: blobName, limit: 1 });
      const f = blobs.find((b) => b.pathname === blobName);
      if (!f) return [];
      const res = await fetch(f.url, { cache: "no-store" });
      return res.ok ? ((await res.json()) as T[]) : [];
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(await fs.readFile(localPath, "utf8")) as T[];
  } catch {
    return [];
  }
}

async function writeStore<T>(localPath: string, blobName: string, data: T[]): Promise<void> {
  if (blobConfigured()) {
    await put(blobName, JSON.stringify(data, null, 2), {
      access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true,
    });
    return;
  }
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(localPath, JSON.stringify(data, null, 2), "utf8");
}

const readProjectsStore = () => readStore<RespondentProject>(LOCAL_PROJ, PROJ_BLOB);
const readRespStore = () => readStore<Respondent>(LOCAL_RESP, RESP_BLOB);

// 读路径：仓库为空 → 回退到内置示例
export async function getProjects(): Promise<RespondentProject[]> {
  const s = await readProjectsStore();
  return s.length ? s : (seedProjects as RespondentProject[]);
}
export async function getRespondents(): Promise<Respondent[]> {
  const s = await readRespStore();
  return s.length ? s : (seedRespondents as Respondent[]);
}

// 首次写入时，把示例“落地”到仓库再改，保证项目与受访者一致地持久化
async function baseProjects(): Promise<RespondentProject[]> {
  const s = await readProjectsStore();
  return s.length ? s : (JSON.parse(JSON.stringify(seedProjects)) as RespondentProject[]);
}
async function baseResp(): Promise<Respondent[]> {
  const s = await readRespStore();
  return s.length ? s : (JSON.parse(JSON.stringify(seedRespondents)) as Respondent[]);
}

// ---- 项目（含变量 schema）CRUD ----
export async function addProject(p: RespondentProject): Promise<RespondentProject> {
  const all = await baseProjects();
  all.push(p);
  await writeStore(LOCAL_PROJ, PROJ_BLOB, all);
  return p;
}
export async function updateProject(
  id: string,
  patch: Partial<Pick<RespondentProject, "name" | "variables">>,
): Promise<RespondentProject | null> {
  const all = await baseProjects();
  const i = all.findIndex((p) => p.id === id);
  if (i === -1) return null;
  all[i] = { ...all[i], ...patch };
  await writeStore(LOCAL_PROJ, PROJ_BLOB, all);
  return all[i];
}
export async function deleteProject(id: string): Promise<boolean> {
  const all = await baseProjects();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false;
  await writeStore(LOCAL_PROJ, PROJ_BLOB, next);
  // 同时移除该项目下的受访者
  const resp = await baseResp();
  await writeStore(LOCAL_RESP, RESP_BLOB, resp.filter((r) => r.project !== id));
  return true;
}

// ---- 受访者 CRUD ----
export async function addRespondent(r: Respondent): Promise<Respondent> {
  const all = await baseResp();
  all.unshift(r);
  await writeStore(LOCAL_RESP, RESP_BLOB, all);
  return r;
}
export async function updateRespondent(
  id: string,
  patch: Partial<Omit<Respondent, "id">>,
): Promise<Respondent | null> {
  const all = await baseResp();
  const i = all.findIndex((r) => r.id === id);
  if (i === -1) return null;
  all[i] = { ...all[i], ...patch };
  await writeStore(LOCAL_RESP, RESP_BLOB, all);
  return all[i];
}
export async function deleteRespondent(id: string): Promise<boolean> {
  const all = await baseResp();
  const next = all.filter((r) => r.id !== id);
  if (next.length === all.length) return false;
  await writeStore(LOCAL_RESP, RESP_BLOB, next);
  return true;
}
