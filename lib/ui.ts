import type { ItemKind } from "./types";
import { LANG } from "./i18n";

const KIND_LABEL_ZH: Record<ItemKind, string> = {
  image: "图像",
  pdf: "PDF",
  doc: "文档",
  slides: "幻灯",
  sheet: "表格",
  archive: "压缩包",
  data: "数据",
  audio: "录音",
  video: "视频",
  other: "文件",
};

const KIND_LABEL_EN: Record<ItemKind, string> = {
  image: "Image",
  pdf: "PDF",
  doc: "Document",
  slides: "Slides",
  sheet: "Spreadsheet",
  archive: "Archive",
  data: "Data",
  audio: "Audio",
  video: "Video",
  other: "File",
};

export const KIND_LABEL: Record<ItemKind, string> =
  LANG === "zh" ? KIND_LABEL_ZH : KIND_LABEL_EN;

// 没有封面的条目用这套淡色做「文字封面」底色，按类型区分但都克制
export const KIND_TINT: Record<ItemKind, string> = {
  image: "#847a6b",
  pdf: "#7c2d2d",
  doc: "#3f6f5b",
  slides: "#9a7b3f",
  sheet: "#3f6f5b",
  archive: "#6b6358",
  data: "#3f5f7c",
  audio: "#8a5a6a",
  video: "#7c2d2d",
  other: "#847a6b",
};

export const KIND_ORDER: ItemKind[] = [
  "doc",
  "pdf",
  "slides",
  "image",
  "audio",
  "video",
  "data",
  "sheet",
  "archive",
  "other",
];

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
