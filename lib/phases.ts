import type { PhaseId } from "./types";
import { LANG } from "./i18n";

export type Phase = {
  id: PhaseId;
  title: string;
  titleEn: string; // secondary label (institution etc.)
  period: string;
  tagline: string;
  intro: string;
  accent: string;
  featured?: boolean;
  parent?: PhaseId;
};

type L = [string, string]; // [zh, en]
type RawPhase = {
  id: PhaseId;
  title: L;
  titleEn: L;
  period: L;
  tagline: L;
  intro: L;
  accent: string;
  featured?: boolean;
  parent?: PhaseId;
};

const RAW: RawPhase[] = [
  {
    id: "undergrad",
    title: ["本科", "Undergraduate"],
    titleEn: ["", ""],
    period: ["", ""],
    tagline: ["研究的起点。", "Where your research began."],
    intro: [
      "上传这一阶段的论文、课程作业、田野笔记等，页面会自动整理成卡片。",
      "Upload theses, coursework, field notes from this stage — they are laid out as cards automatically.",
    ],
    accent: "#8a6d3b",
  },
  {
    id: "master",
    title: ["硕士", "Master"],
    titleEn: ["", ""],
    period: ["", ""],
    tagline: ["进阶研究。", "Deeper into your field."],
    intro: [
      "上传学位论文、方法笔记、数据分析或发表。",
      "Upload your dissertation, method notes, analyses or publications.",
    ],
    accent: "#3f6f5b",
  },
  {
    id: "phd",
    title: ["博士", "PhD"],
    titleEn: ["", ""],
    period: ["", ""],
    tagline: ["核心研究。", "Your core research."],
    intro: [
      "上传研究计划、章节草稿、会议论文与发表。可在首页「Edit structure」里添加子课题。",
      "Upload proposals, chapter drafts, conference papers and publications. Add sub-topics via Edit structure on the home page.",
    ],
    accent: "#1f3d5c",
  },
];

const pick = (l: L) => (LANG === "zh" ? l[0] : l[1]);

export const PHASES: Phase[] = RAW.map((r) => ({
  id: r.id,
  title: pick(r.title),
  titleEn: pick(r.titleEn),
  period: pick(r.period),
  tagline: pick(r.tagline),
  intro: pick(r.intro),
  accent: r.accent,
  featured: r.featured,
  parent: r.parent,
}));

export const PHASE_MAP: Record<PhaseId, Phase> = Object.fromEntries(
  PHASES.map((p) => [p.id, p]),
) as Record<PhaseId, Phase>;

export const TOP_PHASES: Phase[] = PHASES.filter((p) => !p.parent);

export function childrenOf(id: PhaseId): Phase[] {
  return PHASES.filter((p) => p.parent === id);
}

export function isPhaseId(v: string): v is PhaseId {
  return PHASES.some((p) => p.id === v);
}

// ---- 数据化阶段：以上为内置默认；下面的纯函数对任意 phases 数组生效 ----
export const DEFAULT_PHASES: Phase[] = PHASES;

export function mapOf(phases: Phase[]): Record<string, Phase> {
  return Object.fromEntries(phases.map((p) => [p.id, p]));
}
export function topPhasesOf(phases: Phase[]): Phase[] {
  return phases.filter((p) => !p.parent);
}
export function childrenInOf(phases: Phase[], id: string): Phase[] {
  return phases.filter((p) => p.parent === id);
}
