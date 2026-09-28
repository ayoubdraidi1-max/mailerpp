#!/bin/bash
set -e

# ============================================================
# Mail Tracker - One-Command Server Deployment
# ============================================================
# Usage:  bash deploy.sh
#
# What this script does:
#   1. Checks/installs Node.js 20+
#   2. Installs npm dependencies
#   3. Builds the production bundle
#   4. Serves the app on port 80 (server IP)
#
# Press Ctrl+C to stop the server.
# ============================================================

PORT=${1:-80}
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "========================================"
echo "  Mail Tracker - Server Deployment"
echo "========================================"
echo ""

# ------------------------------------------
# Step 1: Check / install Node.js
# ------------------------------------------
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. '.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[!] Node.js $(node -v) is too old. Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    echo "[OK] Node.js $(node -v) detected"
  fi
else
  echo "[..] Node.js not found. Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo ""

# ------------------------------------------
# Step 2: Install dependencies
# ------------------------------------------
echo "[..] Installing dependencies..."
cd "$APP_DIR"
npm install
echo "[OK] Dependencies installed"
echo ""

# ------------------------------------------
# Step 3: Build production bundle
# ------------------------------------------
echo "[..] Building production bundle..."
npm run build
echo "[OK] Build complete"
echo ""

# ------------------------------------------
# Step 4: Serve on the server IP
# ------------------------------------------
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
echo "  App URL:  http://$SERVER_IP:$PORT"
echo ""
echo "  Default login:"
echo "    User:  admin"
echo "    Pass:  Adm1n!2024#secure"
echo ""
echo "  Press Ctrl+C to stop the server."
echo "========================================"
echo ""

# Install serve globally if not present, then run it
npx serve dist -l "$PORT"
