// 阶段/子课题 id 现在是开放字符串（用户可新增子课题）；内置默认为 undergrad/master/phd，可在应用内增删
export type PhaseId = string;

export type ItemKind =
  | "image"
  | "pdf"
  | "doc"
  | "slides"
  | "sheet"
  | "archive"
  | "data"
  | "audio"
  | "video"
  | "other";

export type ResearchItem = {
  id: string;
  phase: PhaseId;
  title: string;
  description?: string;
  year?: string;
  kind: ItemKind;
  /** blob url (cloud), `local:<diskname>` (self-host), or /seed/... (seeded) */
  src: string;
  /** cover thumbnail: `local:<id>.jpg` (storage/covers) or /seed/... path */
  cover?: string;
  /** original mime type, used by the file proxy for local files */
  mime?: string;
  filename: string;
  size?: number;
  createdAt: string;
  seed?: boolean;
  tags?: string[];
  // 著录信息（用于规范引用 / 导出 Zotero）
  author?: string;
  publisher?: string;
  archive?: string;
  callNumber?: string;
  edition?: string;
  // 回收站：设置后视为已删除，可还原或彻底清除
  deletedAt?: string;
  // 种子墓碑：内置种子被彻底清除后保留此标记，防止重新加回
  purgedSeed?: boolean;
};

/** 证据摘录：从某条材料里摘出的引文 + 批注，带来源出处。 */
export type Excerpt = {
  id: string;
  itemId: string;
  itemTitle: string;
  itemKind: ItemKind;
  phase: PhaseId;
  year?: string;
  quote: string;
  note?: string;
  tags?: string[];
  page?: string;
  createdAt: string;
};

/** 已读文献：二手研究论文/著作的书目条目（与一手史料分开）。 */
export type Reading = {
  id: string;
  citation: string;
  year?: string;
  tags?: string[];
  note?: string;
  read: boolean;
  phase?: string; // 所属研究子课题（可选）
  createdAt: string;
};

/** 笔记：自由书写 + 用 [[...]] 链接到其它笔记/史料条目/受访者，长出研究知识网。 */
export type Note = {
  id: string;
  title: string;
  body: string; // 正文，含 [[wikilink]] 链接；链到不存在的标题即“待写存根”
  createdAt: string;
  updatedAt: string;
};

/** 研究日志条目：memo 备忘 / decision 分析决策 / reflexivity 反身性 / auto 系统自动记录的轨迹。 */
export type LogKind = "memo" | "decision" | "reflexivity" | "auto";
export type LogEntry = {
  id: string;
  at: string; // ISO 时间戳
  kind: LogKind;
  body: string;
};

/** 受访者数据库：可配置变量 + 多项目。 */
export type RespVarType = "category" | "number" | "text";
/** 一个变量（列）：类别型→可分面/交叉表；数值型→可分组；文本型→可搜索、详情展示。 */
export type RespVariable = {
  key: string;
  label: string;
  type: RespVarType;
  facet?: boolean; // 仅 category：作为分面筛选 + 交叉表维度
};
/** 一个研究项目/田野，自带变量表（schema）。 */
export type RespondentProject = {
  id: string;
  name: string;
  variables: RespVariable[];
};
/** 受访者：灵活记录，values 装该项目定义的任意变量。 */
export type Respondent = {
  id: string;
  project: string; // 所属项目 id
  code?: string; // 访谈编号（用于把证据引文关联到本人，可选）
  name: string;
  values: Record<string, string | number | null>;
  themes?: string[];
  notes?: string;
  followup?: string;
  remarks?: string;
  transcriptId?: string | null;
  materials?: { id: string; title: string; kind: string }[];
};

/** Map a filename / mime to a coarse kind used for card styling. */
export function detectKind(filename: string, mime?: string): ItemKind {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "tif", "tiff", "bmp", "heic"].includes(ext))
    return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx", "rtf", "odt", "pages", "md", "txt"].includes(ext)) return "doc";
  if (["ppt", "pptx", "key"].includes(ext)) return "slides";
  if (["xls", "xlsx", "xlsm", "csv", "tsv", "numbers"].includes(ext)) return "sheet";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (["m4a", "mp3", "wav", "aac", "ogg", "flac", "m4b", "aiff", "wma"].includes(ext))
    return "audio";
  if (["mp4", "mov", "m4v", "webm", "avi", "mkv"].includes(ext)) return "video";
  if (["geojson", "json", "kml", "kmz", "shp", "gpkg", "pbf", "gml", "xml"].includes(ext))
    return "data";
  if (mime?.startsWith("image/")) return "image";
  if (mime?.startsWith("audio/")) return "audio";
  if (mime?.startsWith("video/")) return "video";
  return "other";
}

/** Best-effort: turn a messy filename into a readable title. */
export function titleFromFilename(filename: string): string {
  let base = filename.replace(/\.[^.]+$/, ""); // strip extension
  base = base.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return base || filename;
}

/** Pull a 4-digit year (19xx / 20xx) out of a filename if present. */
export function yearFromFilename(filename: string): string | undefined {
  const m = filename.match(/(19|20)\d{2}/);
  return m ? m[0] : undefined;
}
