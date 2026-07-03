// 给田野录音/转录按访谈编号（JL001…）打同一个标签，方便录音与转录稿归到一起。幂等。
import { promises as fs } from "fs";
import path from "path";
const CAT = path.join(process.cwd(), "storage", "catalog.json");
const code = (n) => {
  const m = /JL\s*-?\s*0*(\d{1,3})/i.exec(n || "");
  return m ? `JL${m[1].padStart(3, "0")}` : null;
};
let cat;
try { cat = JSON.parse(await fs.readFile(CAT, "utf8")); }
catch { console.log("无本地 catalog，跳过。"); process.exit(0); }
let n = 0;
for (const it of cat) {
  const c = code(it.filename);
  if (!c) continue;
  it.tags = it.tags || [];
  if (!it.tags.includes(c)) { it.tags.unshift(c); n++; }
}
await fs.writeFile(CAT, JSON.stringify(cat, null, 2));
console.log(`✓ 为 ${n} 项加上访谈编号标签（JL###）`);
