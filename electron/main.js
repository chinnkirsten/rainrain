// Electron 主进程：启动内置的 Next 生产服务器（指向可写数据目录），再开一个原生窗口。
// 免装 Node、不开浏览器、不碰命令行。
const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");

const PORT = 38420;
let serverProc = null;
let win = null;

// 打包后：resources/app（asar:false）；开发：项目根
function appRoot() {
  return app.isPackaged ? path.join(process.resourcesPath, "app") : path.join(__dirname, "..");
}

// 每个安装生成并保存一个会话密钥（用于 JWT 签名）
function sessionSecret(dataDir) {
  const f = path.join(dataDir, ".secret");
  try {
    return fs.readFileSync(f, "utf8").trim();
  } catch {
    const s = crypto.randomBytes(32).toString("hex");
    try { fs.writeFileSync(f, s); } catch {}
    return s;
  }
}

function startServer() {
  const dataDir = app.getPath("userData");
  fs.mkdirSync(path.join(dataDir, "storage"), { recursive: true });
  const root = appRoot();
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  serverProc = spawn(process.execPath, [nextBin, "start", root, "-p", String(PORT)], {
    cwd: dataDir, // process.cwd() → 可写数据目录；storage/ 落在这里
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(PORT),
      AUTH_SECRET: process.env.AUTH_SECRET || sessionSecret(dataDir),
      // 首次默认密码；进入后可在「设置」里改成自己的
      AUTH_PASSWORD: process.env.AUTH_PASSWORD || "rainrain",
    },
    stdio: "ignore",
  });
  serverProc.on("exit", () => {});
}

function waitForServer(cb, tries = 0) {
  http
    .get(`http://127.0.0.1:${PORT}/login`, () => cb())
    .on("error", () => {
      if (tries < 150) setTimeout(() => waitForServer(cb, tries + 1), 400);
    });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    title: "社科茅草屋 Rainrain",
    backgroundColor: "#f4f1ea",
    show: false,
    webPreferences: { contextIsolation: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.once("ready-to-show", () => win.show());
  waitForServer(() => win.loadURL(`http://127.0.0.1:${PORT}`));
}

app.whenReady().then(() => {
  startServer();
  createWindow();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("window-all-closed", () => {
  try { serverProc && serverProc.kill(); } catch {}
  app.quit();
});
app.on("before-quit", () => {
  try { serverProc && serverProc.kill(); } catch {}
});
