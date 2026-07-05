# Rainrain 项目决策记忆(给 AI 编码助手)

社科研究者的本地研究图书馆。Next.js 16 App Router + React 19 + TypeScript + Tailwind v4;桌面版 Electron ^33 + electron-builder。**核心承诺:用户数据永不上云**——一切改动不得违背这条。

## 铁律

- **数据只落本机** `storage/`(桌面版在 userData 目录)。`BLOB_READ_WRITE_TOKEN` 存在时走 Vercel Blob(仅线上演示站用),本地开发/测试务必置空该变量,否则会悄悄写云。
- **示例数据必须完全虚构**(现有的「社区花园/Sam Avery」研究),用户写入真数据后示例自动让位(seed-fallback 模式,见 lib/notes.ts 等)。
- **仓库里永远不进真实研究数据、真人信息、密钥。**

## 关键架构决定(别推翻,有原因)

- **i18n**:运行时中英切换。`lib/i18n.ts` 的 `t` 是惰性 Proxy;服务端组件用 `tFor(langFrom(cookie))`;客户端首帧渲染 BUILD_LANG,挂载后 `LangProvider` keyed remount 切换语言。**新客户端常驻 UI 必须放 LangProvider 里面**,否则语言切换不生效(踩过:速记按钮)。**别在模块顶层求值 `t.xxx` 存常量**——会冻结在构建语言。
- **登录页守卫**:全局挂载的组件(CommandPalette、QuickCapture)都要 `pathname === "/login"` 时返回 null,否则未登录时按钮/快捷键泄漏且 API 401(踩过)。
- **⌘K 全局搜索走 `/api/palette`**;`/api/search` 是另一个已存在的 OCR 全文检索端点,别覆盖。
- **快捷键已占用**:⌘K 搜索、⌘J 速记(应用内)、⌘⇧J 全局速记(Electron globalShortcut,经 `rr-quick-capture` CustomEvent 强制打开而非 toggle)。
- **测试**(`npm test`):Node 24 原生 node:test,零框架。API 冒烟测试必须在临时目录里起 `next start`,**绝不碰真实 storage/**。

## 打包发版(全部踩坑验证过)

- **Mac dmg 千万别用 electron-builder 的 dmg target**(压缩失效且无拖拽布局,曾直接导致用户装不上)。流程:`electron-builder --mac --dir` 出 .app,然后 `bash scripts/make-dmg.sh <版本>`(UDZO 压缩 + Applications 软链 + 安装必读.txt)。
- **`"asar": false` 必须保持**——主进程 spawn 子进程跑 Next 服务器,asar 里的文件子进程读不到。
- **`build.files` 里的 `!.next/dev/**` 排除必须保留**——不排除的话安装包从 300MB 膨胀到 700MB+。
- **Windows exe 只能在 Windows 上打**:推 `v*` tag 触发 .github/workflows/build-windows.yml,自动挂 Releases。
- 发版完整清单见 `~/Desktop/社科茅草屋/19_Rainrain产品/工具箱/README-怎么用.md`。
- 发版后**必须真机装一次再对外发**。文档中安装包文件名要同步新版本号,但「0.2.0 起支持XX」这类历史沿革说明不改。

## 本机环境备忘

- 这台 Mac 上 api.github.com 的 TLS 校验会因沙盒时钟失败,API 调用用 `curl -k`(仅限 github.com);git 推拉正常。GitHub 凭据在 osxkeychain(`git credential fill` 可取)。
- 本地开发端口约定 3210(`npm run dev -- -p 3210`),测试密码 test1234。
- 在线演示:rainrain-ten.vercel.app(密码 rainrain2026,Blob 模式只读演示);push main 自动部署。

## 文风约定

- 界面和文档语气:直接、诚实、不装(「诚实的边界」一节是招牌);中文为主。
- 面向用户的文档要"给从没用过软件的本科生看":每步写清点哪里、配截图。
- 内容资产(公众号/说明书/插图源)在 `~/Desktop/社科茅草屋/19_Rainrain产品/`,新版本整体覆盖旧版,不留历史副本。
