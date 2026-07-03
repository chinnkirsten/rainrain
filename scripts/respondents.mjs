// 受访者数据集：以 RA 维护的「受访者追踪表」(storage/受访者追踪表.xlsx) 为权威源，
// 补充转录稿独有字段（过往职业/来源地/年限），并关联录音/转录材料 → storage/respondents.json
// 无 xlsx 时回退为仅解析转录稿。用法: npm run respondents
import { promises as fs } from "fs";
import { readFileSync, existsSync } from "fs";
import path from "path";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

const CWD = process.cwd();
const STORAGE = path.join(CWD, "storage");
const UPLOADS = path.join(STORAGE, "uploads");
const PUBLIC = path.join(CWD, "public");
const TEXT = path.join(STORAGE, "text");
const XLSX_PATH = path.join(STORAGE, "受访者追踪表.xlsx");
const OUT = path.join(STORAGE, "respondents.json");

const load = async (p) => {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return []; }
};
const norm = (c) => {
  const m = /JL[_\s-]*0*(\d{1,3})/i.exec(String(c ?? ""));
  return m ? `JL${m[1].padStart(3, "0")}` : null;
};
const fileOf = (it) =>
  it.src?.startsWith("local:") ? path.join(UPLOADS, it.src.slice(6))
    : it.src?.startsWith("/seed") ? path.join(PUBLIC, it.src) : null;

const DISTRICTS = ["船营区", "昌邑区", "龙潭区", "丰满区", "高新区", "经开区"];
const pickDistrict = (s) => DISTRICTS.find((d) => (s || "").includes(d)) || "";
const ageNum = (s) => {
  const m = /(\d{2,3})/.exec(String(s ?? ""));
  return m ? Number(m[1]) : null;
};
const ageGroup = (n) =>
  n == null ? "未知" : n < 30 ? "<30" : n < 45 ? "30–44" : n < 60 ? "45–59" : "60+";
const jobCategory = (occ) => {
  const t = occ || "";
  if (/退休/.test(t)) return "退休";
  if (/学生|在读|在校|毕业生|应届/.test(t)) return "学生";
  if (/工人|工厂|车间|环卫|保安|普工|技术工|司机/.test(t)) return "工人/服务";
  if (/事业单位|公务员|国企|教师|教职|教授|学校|医院|文员|职员/.test(t)) return "体制内/单位";
  if (/个体|经营|买卖|经商|商户|生意|开店|自由职业|电商|运营/.test(t)) return "个体/自雇";
  if (/务农|农民/.test(t)) return "务农";
  if (/无业|家庭妇女|待业|暂无/.test(t)) return "无业/待业";
  return "其他";
};

// 从转录稿补充表里没有的字段
const SUP = [
  ["pastJob", [/^过往职业/]],
  ["origin", [/^来源地/]],
  ["years", [/^居住年限/, /^在吉林市年限/]],
  ["residenceDetail", [/^居住地/]],
];
async function transcriptText(it) {
  if (!it) return "";
  try {
    const t = await fs.readFile(path.join(TEXT, `${it.id}.txt`), "utf8");
    if (t.trim().length >= 20) return t;
  } catch {}
  const f = fileOf(it);
  if (f && /\.docx?$/i.test(f)) {
    try { return (await mammoth.extractRawText({ path: f })).value || ""; } catch {}
  }
  return "";
}
function parseSup(text) {
  const out = {};
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const mm = /^([^：:]{1,14})[：:]\s*(.+)$/.exec(line);
    if (!mm) continue;
    for (const [key, pats] of SUP) {
      if (out[key]) continue;
      if (pats.some((p) => p.test(mm[1]))) out[key] = mm[2].trim();
    }
  }
  return out;
}

async function main() {
  const cat = await load(path.join(STORAGE, "catalog.json"));
  // 编号 → 材料、转录稿
  const byCode = new Map();
  const transcriptByCode = new Map();
  for (const it of cat) {
    const c = norm(it.filename) || norm(it.title);
    if (!c) continue;
    if (!byCode.has(c)) byCode.set(c, []);
    byCode.get(c).push({ id: it.id, title: it.title, kind: it.kind });
    if (it.kind === "doc" && /访谈记录整理稿|访谈记录|转录/.test(it.title || ""))
      transcriptByCode.set(c, it);
  }

  let respondents = [];

  if (existsSync(XLSX_PATH)) {
    const wb = XLSX.read(readFileSync(XLSX_PATH), { type: "buffer" });
    const ws = wb.Sheets["受访者追踪总表"] || wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
    const h = rows.findIndex((r) => (r || []).some((c) => String(c).includes("代码")));
    const head = rows[h].map((c) => String(c || "").replace(/\n/g, " ").trim());
    const idx = (kw, not) =>
      head.findIndex((c) => c.includes(kw) && (!not || !c.includes(not)));
    const C = {
      code: idx("代码"), name: idx("访谈者"), age: idx("年龄"), gender: idx("性别"),
      occ: idx("职业"), dist: idx("居住区"), edu: idx("受教育"), inc: idx("收入"),
      date: idx("访谈日期"), dur: idx("时长"), notes: idx("访谈备注"),
      theme1: idx("关键主题1"), theme2: idx("关键主题2"), followup: idx("跟进"),
      pri: idx("优先级"), remarks: head.findIndex((c) => /备注|Remarks/.test(c) && !c.includes("访谈")),
    };
    const seen = new Set();
    for (const r of rows.slice(h + 1)) {
      const code = norm(r[C.code]);
      if (!code || seen.has(code)) continue;
      const name = String(r[C.name] ?? "").trim();
      if (!name) continue; // 跳过未填的计划行
      seen.add(code);
      const an = ageNum(r[C.age]);
      const distRaw = String(r[C.dist] ?? "").trim();
      const occ = String(r[C.occ] ?? "").trim();
      // 转录稿补充
      const tr = transcriptByCode.get(code);
      const sup = tr ? parseSup(await transcriptText(tr)) : {};
      respondents.push({
        code,
        name,
        gender: /女/.test(String(r[C.gender])) ? "女" : /男/.test(String(r[C.gender])) ? "男" : "",
        age: an,
        ageGroup: ageGroup(an),
        education: String(r[C.edu] ?? "").trim(),
        currentJob: occ,
        jobCategory: jobCategory(occ),
        pastJob: sup.pastJob || "",
        residence: sup.residenceDetail || distRaw,
        district: pickDistrict(distRaw) || pickDistrict(sup.residenceDetail),
        years: sup.years || "",
        origin: sup.origin || "",
        income: String(r[C.inc] ?? "").trim(),
        interviewDate: String(r[C.date] ?? "").replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3").trim(),
        duration: String(r[C.dur] ?? "").trim(),
        priority: String(r[C.pri] ?? "").trim(),
        themes: [r[C.theme1], r[C.theme2]].map((x) => String(x ?? "").trim()).filter(Boolean),
        notes: String(r[C.notes] ?? "").trim(),
        followup: String(r[C.followup] ?? "").trim(),
        remarks: C.remarks >= 0 ? String(r[C.remarks] ?? "").trim() : "",
        transcriptId: tr ? tr.id : null,
        materials: byCode.get(code) || [],
      });
    }
    console.log(`权威源：受访者追踪表（${respondents.length} 位）`);
  } else {
    console.log("未找到 storage/受访者追踪表.xlsx，回退为仅解析转录稿。");
    // 简化回退：用转录稿
    for (const [code, tr] of transcriptByCode) {
      const sup = parseSup(await transcriptText(tr));
      respondents.push({
        code, name: "", gender: "", age: null, ageGroup: "未知", education: "",
        currentJob: "", jobCategory: "其他", pastJob: sup.pastJob || "",
        residence: sup.residenceDetail || "", district: pickDistrict(sup.residenceDetail),
        years: sup.years || "", origin: sup.origin || "", income: "",
        interviewDate: "", duration: "", priority: "", themes: [], notes: "", followup: "", remarks: "",
        transcriptId: tr.id, materials: byCode.get(code) || [],
      });
    }
  }

  respondents.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  await fs.writeFile(OUT, JSON.stringify(respondents, null, 2));
  const filled = (k) => respondents.filter((r) => r[k]).length;
  console.log(`✓ ${respondents.length} 位 → storage/respondents.json`);
  console.log(`  性别${filled("gender")}｜职业${filled("currentJob")}｜居住区${filled("district")}｜年龄${respondents.filter((r) => r.age).length}｜有转录${filled("transcriptId")}｜有录音${respondents.filter((r) => r.materials.some((m) => m.kind === "audio")).length}`);
}

main().catch((e) => { console.error("解析出错：", e.message); process.exit(1); });
