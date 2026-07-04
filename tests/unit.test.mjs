// 数据层单元测试：匿名化 / 密码 / 编码本 / 引用格式 / 备份打包。
// 零依赖：Node 24 自带 node:test + 对 .ts 的类型剥离。跑法：npm run test:unit
// 注意：password/backup 在模块加载时绑定 process.cwd() —— 各自在动态 import 前 chdir 到临时目录。
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("applyAnon：全量替换、按对儿顺序、空 from 跳过", async () => {
  const { applyAnon } = await import("../lib/anon-util.ts");
  assert.equal(applyAnon("张伟去了公园，张伟又回来了", [{ from: "张伟", to: "P01" }]), "P01去了公园，P01又回来了");
  assert.equal(
    applyAnon("Zhang Wei met Li Na", [{ from: "Zhang Wei", to: "P01" }, { from: "Li Na", to: "P02" }]),
    "P01 met P02",
  );
  // 契约：按 pairs 顺序依次替换 —— 长名必须排在短名前面才安全
  assert.equal(
    applyAnon("张伟民和张伟", [{ from: "张伟民", to: "P02" }, { from: "张伟", to: "P01" }]),
    "P02和P01",
  );
  assert.equal(applyAnon("原文不变", [{ from: "  ", to: "X" }]), "原文不变");
  assert.equal(applyAnon("原文不变", []), "原文不变");
});

test("password：环境变量回退 + scrypt 本地哈希优先", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "rr-pw-"));
  process.chdir(dir);
  process.env.AUTH_PASSWORD = "env-secret";
  const { verifyPassword, setPassword } = await import("../lib/password.ts");
  assert.equal(await verifyPassword("env-secret"), true, "无本地哈希时回退 AUTH_PASSWORD");
  assert.equal(await verifyPassword("wrong"), false);
  await setPassword("local-secret");
  assert.equal(await verifyPassword("local-secret"), true, "本地哈希生效");
  assert.equal(await verifyPassword("env-secret"), false, "有本地哈希后环境变量失效");
  assert.equal(await verifyPassword(""), false);
});

test("codebook：JSON 读写往返（STORAGE_DIR 隔离）", async () => {
  process.env.STORAGE_DIR = await mkdtemp(path.join(tmpdir(), "rr-cb-"));
  const { getCodebook, saveCodebook } = await import("../lib/codebook.ts");
  assert.deepEqual(await getCodebook(), [], "空库返回 []");
  await saveCodebook([
    { tag: "belonging", definition: "归属感——何时用/何时不用", parent: undefined },
    { tag: "care", parent: "belonging" },
  ]);
  const back = await getCodebook();
  assert.equal(back.length, 2);
  assert.equal(back[0].definition, "归属感——何时用/何时不用");
  assert.equal(back[1].parent, "belonging");
});

test("引用格式：GB/T + APA + 空结构回退 + BibTeX 往返", async () => {
  // 直接测引擎 lib/reference.ts（其导入均为 type-only，类型剥离后无运行时依赖；
  // 包装层 ref-format.ts 的无扩展名相对导入在 Node ESM 下不可解析，属打包器语义）
  const { formatCitation, readingToBibtex, parseBibtex } = await import("../lib/reference.ts");
  const r = {
    id: "abcd1234", citation: "", read: true, createdAt: "2026-01-01",
    type: "article", authors: ["Dingxin Zhao", "Jane Smith"], title: "Test Title",
    container: "Test Journal", year: "2020", volume: "5", issue: "2", pages: "10-20",
  };
  const gb = formatCitation(r, "gbt");
  assert.ok(gb.includes("Test Title") && gb.includes("[J]") && gb.includes("2020"), `GB/T 缺要素: ${gb}`);
  const apa = formatCitation(r, "apa");
  assert.ok(apa.includes("(2020)") && apa.includes("Test Journal"), `APA 缺要素: ${apa}`);
  assert.equal(
    formatCitation({ id: "x", citation: "自由文本题录。", read: false, createdAt: "" }, "gbt"),
    "自由文本题录。",
    "结构化字段全空 → 原样回退 citation",
  );
  const parsed = parseBibtex(readingToBibtex(r));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, "Test Title");
  assert.equal(String(parsed[0].year), "2020");
  assert.equal(parsed[0].authors?.length, 2, "作者数量在 BibTeX 往返后保持");
});

test("createBackup：打包 storage/、排除 backups/", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "rr-bk-"));
  process.chdir(dir);
  await mkdir(path.join(dir, "storage", "backups"), { recursive: true });
  await writeFile(path.join(dir, "storage", "readings.json"), JSON.stringify([{ id: "r1" }]));
  await writeFile(path.join(dir, "storage", "backups", "old.zip"), "x");
  const { createBackup } = await import("../lib/backup.ts");
  const { file, size } = await createBackup(new Date("2026-01-02T03:04:00"));
  assert.ok(size > 0, "zip 非空");
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await readFile(path.join(dir, file)));
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  assert.ok(names.includes("readings.json"), `zip 内容: ${names}`);
  assert.ok(!names.some((n) => n.startsWith("backups/")), "不递归打包历史备份");
  assert.equal(await zip.files["readings.json"].async("string"), JSON.stringify([{ id: "r1" }]));
});
