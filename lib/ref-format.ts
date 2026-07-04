// 结构化引用的对外格式化入口。
// ponytail: 这个文件不重造引擎——lib/reference.ts 已经有一套跑在生产里的
// GB/T 7714 / APA / BibTeX 读写 / CrossRef 映射（导入面板、[id] 路由都在用）。
// 这里只做「换个更贴合前端调用习惯的薄封装」，避免同一份格式化逻辑长出第二套。
import type { Reading } from "./types";
import {
  formatGbt,
  formatApa,
  readingToBibtex,
  parseBibtex as parseBibtexEngine,
} from "./reference";

/** GB/T 7714-2015（gb）或 APA 7（apa）成文引用；结构化字段全空则原样回退 r.citation。 */
export function formatCitation(r: Reading, style: "gb" | "apa"): string {
  return style === "gb" ? formatGbt(r) : formatApa(r);
}

/** 批量导出为 BibTeX（@article/@book/@phdthesis/@incollection/@misc，按 reference.ts 既有映射）。 */
export function toBibtexReadings(rs: Reading[]): string {
  return rs.map(readingToBibtex).join("\n\n");
}

/** BibTeX 里作者字段按惯例写成 "Family, Given"；这里归一成展示用的 "Given Family"。 */
function toGivenFamily(name: string): string {
  const i = name.indexOf(",");
  if (i === -1) return name;
  const family = name.slice(0, i).trim();
  const given = name.slice(i + 1).trim();
  return given ? `${given} ${family}` : family;
}

/** 解析一段（可含多条）BibTeX → Partial<Reading>[]；解析失败的条目跳过，不抛错。
 *  字段切分 / 花括号嵌套 / 类型映射复用 lib/reference.ts 的解析器，这里只加作者姓名归一化。 */
export function parseBibtex(src: string): Partial<Reading>[] {
  return parseBibtexEngine(src).map((ref) => ({
    ...ref,
    authors: ref.authors?.map(toGivenFamily),
  }));
}

// ponytail: self-check —— 手测样例（未建测试框架，逻辑变了请重跑一遍确认）
//
// 1) formatCitation(gb)：完整字段
//    输入 authors=["Zhao, Dingxin","Smith, John"], title="Test Title", type="article",
//         container="Test Journal", volume="5", issue="2", pages="10–20", year="2020"
//    输出 "Zhao D，Smith J. Test Title[J]. Test Journal, 2020, 5(2): 10–20."
//
// 2) formatCitation(apa)：同上字段
//    输出 "Zhao, D., & Smith, J. (2020). Test Title. Test Journal, 5(2), 10–20."
//
// 3) formatCitation：结构化字段全空（仅 citation）→ 原样返回 r.citation，不抛错、不产生 "undefined"。
//
// 4) toBibtexReadings：2 条 Reading → 用 "\n\n" 连接的 2 个 @article{...} 块，
//    键 = 第一作者字段去标点+年+id 前 4 位，如 authors[0]="Zhao, Dingxin", year="2020", id="abcdef12…" → "ZhaoDingxin2020_abcd"。
//
// 5) parseBibtex：
//    - `@article{key1,\n  author = {Zhao, Dingxin and Smith, John},\n  title = {The {Rise} of Something},\n  journal = {J},\n  year = 2020,\n  pages = {10--20}\n}`
//      → authors ["Dingxin Zhao","John Smith"]（已归一）, title "The Rise of Something"（花括号剥离）,
//        container "J", year "2020", pages "10–20"。
//    - 带引号写法 `title = "Quoted"` 与裸数字 `year = 2020` 都能解析。
//    - 缺右花括号的截断条目：不抛错，直接跳过该条（对应片段停在未闭合处，后续无法定位则整体停止扫描）。
