#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo ""
echo "  ========================================================"
echo "    WINDOWS SYSTEM UPDATE & OPTIMIZATION SUITE v5.0"
echo "                      Web UI Launcher"
echo "  ========================================================"
echo ""

command -v node >/dev/null 2>&1 || { echo "  [ERROR] Node.js not found. Install from https://nodejs.org/"; exit 1; }
echo "  [OK] Node.js $(node -v)"
echo "  [OK] npm v$(npm -v)"
echo ""

if [ ! -d "node_modules" ]; then
  echo "  [..] Installing dependencies..."
  npm install --loglevel=error
  echo "  [OK] Done."
else
  echo "  [OK] Dependencies ready."
fi

echo ""
echo "  ========================================================"
echo "    Starting on http://localhost:5173"
echo "    Press Ctrl+C to stop"
echo "  ========================================================"
echo ""

npm run dev -- --host
