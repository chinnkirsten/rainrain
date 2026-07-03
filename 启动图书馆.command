#!/bin/bash
# 双击本文件即可启动「rainrain」。
cd "$(dirname "$0")" || exit 1
clear
echo "════════════════════════════════════════"
echo "      rainrain · 启动中"
echo "════════════════════════════════════════"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "⚠️  未检测到 Node.js。"
  echo "    请先到 https://nodejs.org 安装 LTS 版本，然后再双击本文件。"
  echo ""
  read -n 1 -s -r -p "按任意键关闭…"
  exit 1
fi

# iCloud 同步的「桌面 / 文稿」会同步构建缓存(.next)，与之竞争导致启动失败或极慢。
case "$(pwd -P)/" in
  "$HOME/Desktop/"*|"$HOME/Documents/"*)
    if [ -d "$HOME/Library/Mobile Documents/com~apple~CloudDocs" ]; then
      echo "⚠️  当前文件夹位于 iCloud 同步的「桌面/文稿」中。"
      echo "    iCloud 会同步内部构建缓存(.next)，可能导致启动失败或非常慢。"
      echo "    强烈建议：把整个文件夹移动到不被同步的位置（例如 ~/rainrain）后再双击启动。"
      echo ""
      read -n 1 -s -r -p "按任意键仍要继续，或按 Control+C 退出去移动文件夹…"
      echo ""
    fi ;;
esac

if [ ! -d node_modules ]; then
  echo "📦 首次运行：正在安装依赖（需联网，约几分钟）…"
  npm install || { echo "安装失败，请检查网络。"; read -n 1; exit 1; }
fi

[ -f .env.local ] || npm run setup

echo "🖼  生成 / 更新书封（首次较慢，之后秒过）…"
npm run covers

echo "🔎 后台建立全文索引（录音稿/文档可搜正文，不阻塞启动）…"
( npm run index > /dev/null 2>&1 & )

echo "🧑‍🤝‍🧑 解析受访者数据集…"
npm run respondents

echo "🏗  准备界面（首次较慢，之后很快）…"
npm run build

echo ""
echo "✅ 启动完成！浏览器将自动打开 http://localhost:3000"
echo "   访问密码见 .env.local（默认 rainrain）"
echo "   ⏹  关闭图书馆：在本窗口按 Control + C"
echo ""

( sleep 4; open http://localhost:3000 ) &
npm run start
