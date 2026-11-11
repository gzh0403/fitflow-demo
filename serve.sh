#!/bin/bash
cd "$(dirname "$0")"
PORT="${1:-8765}"
echo "FitFlow 演示样品已准备好。"
echo "请在浏览器打开： http://127.0.0.1:${PORT}/"
echo "也可以直接用浏览器打开本目录中的 index.html。"
echo "按 Ctrl+C 结束本地预览。"
python3 -m http.server "$PORT" --bind 127.0.0.1
