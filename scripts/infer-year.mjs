// 从标题推断年代并填入缺失的 year：民国/昭和/康德/大同 纪年 → 公元。默认 dry-run，--apply 写回。
// 民国+1911 · 昭和+1925 · 康德+1933(康德元年=1934) · 大同+1931(大同元年=1932)
import { promises as fs } from "fs";
import path from "path";

const CATALOG = path.join(process.cwd(), "storage", "catalog.json");
const apply = process.argv.includes("--apply");
const ERA = { 民国: 1911, 昭和: 1925, 康德: 1933, 大同: 1931 };

function cnNum(s) {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (s === "元") return 1;
  const m = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (s.includes("十")) {
    const [a, b] = s.split("十");
    return (a === "" ? 1 : m[a] ?? 0) * 10 + (b === "" ? 0 : m[b] ?? 0);
  }
  return m[s] ?? 0;
}

function inferYear(title) {
  const re = /(民国|昭和|康德|大同)\s*([元〇零一二三四五六七八九十两\d]+)\s*年/;
  const mt = title.match(re);
  if (!mt) return null;
  const n = cnNum(mt[2]);
  if (!n) return null;
  const ce = ERA[mt[1]] + n;
  if (ce < 1900 || ce > 1960) return null; // 合理区间防错
  return String(ce);
}

const cat = JSON.parse(await fs.readFile(CATALOG, "utf8"));
const changes = [];
for (const it of cat) {
  if (it.deletedAt || it.year) continue;
  const y = inferYear(it.title || "");
  if (y) changes.push([it.title, y, it]);
}

console.log(`可补年代 ${changes.length} 条（前 → 推断年代）：`);
for (const [a, y] of changes.slice(0, 20)) console.log(`  ${a}\n   → ${y}`);

if (apply) {
  for (const [, y, it] of changes) it.year = y;
  await fs.writeFile(CATALOG, JSON.stringify(cat, null, 2));
  console.log(`\n✓ 已为 ${changes.length} 条补上 year。`);
} else {
  console.log(`\n(dry-run。确认后 --apply)`);
}
