// 访问密码：优先用本机设置的（storage/auth.json，scrypt 哈希），否则回退环境变量 AUTH_PASSWORD。
import { promises as fs } from "fs";
import path from "path";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const FILE = path.join(process.cwd(), "storage", "auth.json");
type Stored = { salt: string; hash: string };

async function read(): Promise<Stored | null> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Stored;
  } catch {
    return null;
  }
}

export async function verifyPassword(plain: string): Promise<boolean> {
  const stored = await read();
  if (stored?.salt && stored?.hash) {
    try {
      const got = scryptSync(plain, stored.salt, 64);
      const want = Buffer.from(stored.hash, "hex");
      return got.length === want.length && timingSafeEqual(got, want);
    } catch {
      return false;
    }
  }
  const env = process.env.AUTH_PASSWORD;
  return !!env && plain === env;
}

export async function setPassword(plain: string): Promise<void> {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify({ salt, hash }), "utf8");
}
