// 数据层集成冒烟：起一个真实 next start，storage 指向临时目录（进程 cwd = 临时目录，
// 因为 backup/catalog 以 process.cwd()/storage 定位数据），跑「灾难路径」全链路：
// 登录 cookie 形态 → 文献 CRUD → 匿名化 → 编码本 → 证据 → 备份 zip → 删库 → 恢复 → 防目录穿越。
// 跑法：npm run build && npm run test:api
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3941;
const BASE = `http://127.0.0.1:${PORT}`;
const PASS = "test-secret";

let failures = 0;
function ok(cond, name, extra = "") {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name} ${extra}`);
  }
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

const work = await mkdtemp(path.join(tmpdir(), "rr-api-"));
try {
  await access(path.join(REPO, ".next"));
} catch {
  console.error("缺少 .next 构建产物——先跑 npm run build");
  process.exit(1);
}

const srv = spawn(
  process.execPath,
  [path.join(REPO, "node_modules", "next", "dist", "bin", "next"), "start", REPO, "-p", String(PORT)],
  {
    cwd: work, // 关键：storage/ 落在临时目录，绝不碰真实数据
    env: { ...process.env, AUTH_PASSWORD: PASS, AUTH_SECRET: "test-secret-hex-0123456789abcdef", BLOB_READ_WRITE_TOKEN: "", PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
srv.stderr.on("data", (d) => process.env.DEBUG_SMOKE && console.error(String(d)));

try {
  // 等服务就绪
  let up = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/login`);
      if (r.status === 200) {
        up = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!up) throw new Error("server did not start");
  console.log("server up, storage =", path.join(work, "storage"));

  // 1) 未登录访问受保护 API
  {
    const r = await fetch(`${BASE}/api/palette?q=x`);
    ok(r.status === 401 || r.status === 403 || r.status === 307, "未登录的 /api/palette 被拒", `got ${r.status}`);
  }

  // 2) 登录 cookie 形态：默认会话 cookie（无 Max-Age），记住我 = 30 天
  let cookie = "";
  {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: PASS }),
    });
    const sc = r.headers.getSetCookie().join("; ");
    ok(r.status === 200 && sc.includes("jy_session"), "登录成功且发出会话 cookie");
    ok(!/max-age/i.test(sc), "默认不记住 → 无 Max-Age（关浏览器即失效）", sc);
  }
  {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: PASS, remember: true }),
    });
    const sc = r.headers.getSetCookie().join("; ");
    ok(/max-age=2592000/i.test(sc), "记住我 → Max-Age=2592000", sc);
    cookie = sc.split(";")[0];
  }
  const H = { Cookie: cookie, "Content-Type": "application/json" };

  // 3) 文献 CRUD + 题录合成
  let readingId = "";
  {
    const r = await fetch(`${BASE}/api/readings`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ title: "冒烟测试文献", authors: ["Test Author"], year: "2021", type: "article", container: "J. Smoke" }),
    });
    const d = await r.json();
    readingId = d.reading?.id ?? "";
    ok(r.status === 200 && readingId, "POST /api/readings 建结构化条目");
    ok((d.reading?.citation ?? "").includes("冒烟测试文献"), "未给 citation 时自动合成题录", d.reading?.citation);
  }
  {
    const r = await fetch(`${BASE}/api/readings/${readingId}`, { method: "PATCH", headers: H, body: JSON.stringify({ read: true }) });
    const d = await r.json();
    ok(r.status === 200 && d.reading?.read === true, "PATCH 标记已读");
  }

  // 4) 匿名化映射
  {
    const put = await fetch(`${BASE}/api/anon`, { method: "PUT", headers: H, body: JSON.stringify({ pairs: [{ from: "张伟", to: "P01" }] }) });
    const get = await fetch(`${BASE}/api/anon`, { headers: H }).then((r) => r.json());
    ok(put.status === 200 && get.pairs?.[0]?.to === "P01", "匿名化对照表读写往返");
  }

  // 5) 编码本
  {
    const put = await fetch(`${BASE}/api/codebook`, { method: "PUT", headers: H, body: JSON.stringify({ defs: [{ tag: "belonging", definition: "归属感", parent: "" }] }) });
    const get = await fetch(`${BASE}/api/codebook`, { headers: H }).then((r) => r.json());
    ok(put.status === 200 && get.defs?.[0]?.definition === "归属感", "编码本定义读写往返");
  }

  // 6) 证据
  {
    const r = await fetch(`${BASE}/api/evidence`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ itemId: "it1", itemTitle: "Interview P01 — transcript", itemKind: "doc", phase: "phd", quote: "冒烟测试引文", tags: ["belonging"] }),
    });
    const list = await fetch(`${BASE}/api/evidence`, { headers: H }).then((x) => x.json());
    ok(r.status === 200 && JSON.stringify(list).includes("冒烟测试引文"), "证据摘录写入并可读回");
  }

  // 7) 备份 → 删库 → 恢复（灾难路径）
  let zipBuf;
  {
    const r = await fetch(`${BASE}/api/backup`, { headers: { Cookie: cookie } });
    zipBuf = Buffer.from(await r.arrayBuffer());
    ok(r.status === 200 && zipBuf.length > 0 && zipBuf.slice(0, 2).toString() === "PK", "GET /api/backup 产出 zip");
  }
  {
    await rm(path.join(work, "storage", "readings.json"), { force: true });
    const gone = await fetch(`${BASE}/api/readings`, { headers: { Cookie: cookie } }).then((r) => r.json());
    ok(!JSON.stringify(gone).includes("冒烟测试文献"), "删掉 readings.json 后数据丢失（回退种子）");
    const fd = new FormData();
    fd.append("file", new Blob([zipBuf], { type: "application/zip" }), "backup.zip");
    const res = await fetch(`${BASE}/api/backup/restore`, { method: "POST", headers: { Cookie: cookie }, body: fd });
    const d = await res.json();
    ok(res.status === 200 && d.ok && d.count > 0, "restore 接受备份 zip", JSON.stringify(d));
    const back = await fetch(`${BASE}/api/readings`, { headers: { Cookie: cookie } }).then((r) => r.json());
    ok(JSON.stringify(back).includes("冒烟测试文献"), "恢复后数据回来了");
  }

  // 8) 防目录穿越：zip 里的 ../evil.txt 不能逃出 storage/
  {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("../evil.txt", "escaped");
    zip.file("inside.txt", "ok");
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const fd = new FormData();
    fd.append("file", new Blob([buf], { type: "application/zip" }), "evil.zip");
    const res = await fetch(`${BASE}/api/backup/restore`, { method: "POST", headers: { Cookie: cookie }, body: fd });
    const d = await res.json();
    // 真正的不变量：任何条目都不得落在 storage/ 之外。
    // （JSZip 读取时会把 ../ 归一掉 —— 第一道防线；路由的 startsWith 守卫是第二道。
    //   所以 ../evil.txt 允许以 evil.txt 落在 storage 里，但绝不能出现在外面。）
    ok(res.status === 200 && d.ok, "restore 处理含穿越条目的 zip 不报错", JSON.stringify(d));
    ok(!(await exists(path.join(work, "evil.txt"))), "../evil.txt 没有逃出 storage");
    ok(!(await exists(path.join(tmpdir(), "evil.txt"))), "也没有落到系统临时目录");
    ok(await exists(path.join(work, "storage", "inside.txt")), "安全条目正常落盘");
  }

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
} finally {
  srv.kill("SIGTERM");
}
process.exit(failures === 0 ? 0 : 1);
