// 本地一键配置：生成 .env.local（随机会话密钥 + 默认访问密码）。
// 仅补齐缺失项，不覆盖已有设置。
import { writeFileSync, existsSync, readFileSync } from "fs";
import { randomBytes } from "crypto";

const ENV = ".env.local";
const lines = existsSync(ENV) ? readFileSync(ENV, "utf8").split("\n") : [];
const has = (k) => lines.some((l) => l.trim().startsWith(k + "="));

if (!has("AUTH_PASSWORD")) lines.push("AUTH_PASSWORD=rainrain");
if (!has("AUTH_SECRET")) lines.push("AUTH_SECRET=" + randomBytes(32).toString("hex"));

writeFileSync(ENV, lines.filter((l) => l.trim() !== "").join("\n") + "\n");

console.log("✓ .env.local 已就绪（本地磁盘存储模式）。");
console.log("  默认访问密码：rainrain  —— 可在 .env.local 修改 AUTH_PASSWORD");
console.log("  下一步：  npm run dev   然后打开 http://localhost:3000");
