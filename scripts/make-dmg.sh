#!/bin/bash
# 打 Mac 安装盘：规范布局（app + Applications 拖拽目标 + 安装必读），UDZO 压缩。
# 前置：dist/mac-arm64/Rainrain.app 已由 `npx electron-builder --mac --dir` 产出。
# 用法：scripts/make-dmg.sh <版本号>   （产出 dist/Rainrain-<版本>-arm64.dmg）
# 注意：不要用 electron-builder 直接出 dmg（压缩不生效、无拖拽布局），务必走本脚本。
set -euo pipefail
VER="${1:?用法: scripts/make-dmg.sh <版本号>}"
APP="dist/mac-arm64/Rainrain.app"
STAGE="dist/dmg-stage"
OUT="dist/Rainrain-${VER}-arm64.dmg"

[ -d "$APP" ] || { echo "缺少 $APP —— 先跑: npx electron-builder --mac --dir"; exit 1; }

rm -rf "$STAGE" "$OUT"
mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
cp "scripts/dmg-安装必读.txt" "$STAGE/安装必读.txt"

hdiutil create -volname "Rainrain" -srcfolder "$STAGE" -ov -format UDZO "$OUT"
rm -rf "$STAGE"
ls -lh "$OUT"
