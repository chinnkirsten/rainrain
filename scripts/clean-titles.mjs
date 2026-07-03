// 标题清洗（保守规则，保留原 filename 不动）。默认 dry-run；加 --apply 才写回。
// 规则：① 去库代码前缀(XFZ18604. 等) ② 去末尾扫描批号(6+位长数字) ③ 合并多余空格
import { promises as fs } from "fs";
import path from "path";

const CATALOG = path.join(process.cwd(), "storage", "catalog.json");
const apply = process.argv.includes("--apply");

function clean(t) {
  let s = t;
  s = s.replace(/^[A-Za-z]{2,4}\s?\d+(\(\d+\))?\s*[.．]\s*/, ""); // 库代码前缀
  s = s.replace(/\s+\d{6,}(\s+[\d-]{1,8})?\s*$/, "");            // 末尾扫描批号(+可选批次后缀, 含 0001-2 这种)
  s = s.replace(/_/g, " ").replace(/\s{2,}/g, " ").trim();        // 空格规整
  return s;
}

const cat = JSON.parse(await fs.readFile(CATALOG, "utf8"));
let changes = [];
for (const it of cat) {
  if (it.deletedAt) continue;
  const c = clean(it.title || "");
  if (c && c.length >= 2 && c !== it.title) changes.push([it.title, c, it]);
}

console.log(`可清洗 ${changes.length} / ${cat.length} 条。示例（前 → 后）：`);
for (const [a, b] of changes.slice(0, 24)) console.log(`  ${a}\n   → ${b}`);

if (apply) {
  for (const [, c, it] of changes) it.title = c;
  await fs.writeFile(CATALOG, JSON.stringify(cat, null, 2));
  console.log(`\n✓ 已应用 ${changes.length} 条标题清洗（filename 保持不变）。`);
} else {
  console.log(`\n(dry-run。确认后用 --apply 写回)`);
}
