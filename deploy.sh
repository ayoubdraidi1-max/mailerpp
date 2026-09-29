#!/bin/bash
set -e

# ============================================================
# Mail Tracker - One-Command Production Deployment
# ============================================================
# Usage:  bash deploy.sh
#
# What this script does:
#   1. Checks/installs Node.js 20+
#   2. Installs npm dependencies (production build only)
#   3. Builds the production bundle
#   4. Creates a systemd service so the app runs 24/7, auto-restarts,
#      and survives server reboots
#   5. Opens port 5030 in the firewall (if ufw/iptables active)
#   6. Stops any old instance on port 5030 before starting
#
# Does NOT touch nginx or any other running app.
# App is available at:  http://SERVER_IP:5030
# ============================================================

PORT=5030
APP_NAME="mail-tracker"
APP_DIR="$(cd "$(dirname "$0") && pwd)"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"

echo ""
echo "========================================"
echo "  Mail Tracker - Production Deployment"
echo "  Port: $PORT"
echo "========================================"
echo ""

# ------------------------------------------
# Step 1: Check / install Node.js 20+
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
# Step 4: Stop any existing instance on this port
# ------------------------------------------
echo "[..] Stopping any existing instance..."
if systemctl is-active --quiet "$APP_NAME" 2>/dev/null; then
  sudo systemctl stop "$APP_NAME" || true
fi
# Kill anything still listening on the port
PID_ON_PORT=$(sudo lsof -ti tcp:"$PORT" 2>/dev/null || true)
if [ -n "$PID_ON_PORT" ]; then
  echo "[!] Port $PORT is in use by PID $PID_ON_PORT — stopping it..."
  sudo kill -9 "$PID_ON_PORT" 2>/dev/null || true
fi
echo "[OK] Port $PORT is clear"
echo ""

# ------------------------------------------
# Step 5: Install serve globally (lightweight static server)
# ------------------------------------------
echo "[..] Ensuring 'serve' is available..."
npm list -g serve &>/dev/null || sudo npm install -g serve
echo "[OK] serve ready"
echo ""

# ------------------------------------------
# Step 6: Create systemd service for 24/7 operation
# ------------------------------------------
echo "[..] Creating systemd service..."
SERVE_BIN=$(which serve)

sudo tee "$SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=Mail Tracker App (port $PORT)
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=$SERVE_BIN dist -l $PORT --no-clipboard
Restart=always
RestartSec=3
User=$(whoami)
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$APP_NAME"
sudo systemctl start "$APP_NAME"
echo "[OK] Service created and started"
echo ""

# ------------------------------------------
# Step 7: Open firewall port if needed
# ------------------------------------------
if command -v ufw &>/dev/null; then
  if sudo ufw status | grep -q "active"; then
    echo "[..] Opening port $PORT in ufw firewall..."
    sudo ufw allow "$PORT"/tcp
    echo "[OK] Firewall rule added"
  fi
fi
if command -v firewall-cmd &>/dev/null; then
  echo "[..] Opening port $PORT in firewalld..."
  sudo firewall-cmd --permanent --add-port="$PORT"/tcp
  sudo firewall-cmd --reload
  echo "[OK] Firewall rule added"
fi
echo ""

# ------------------------------------------
# Step 8: Verify the app is running
# ------------------------------------------
sleep 2
if systemctl is-active --quiet "$APP_NAME"; then
  echo "[OK] Service is running"
else
  echo "[!] Service failed to start. Check logs: sudo journalctl -u $APP_NAME -n 50"
  exit 1
fi

SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
echo "  App URL:  http://$SERVER_IP:$PORT"
echo ""
echo "  The app runs 24/7 as a systemd service."
echo "  It auto-restarts on crash and survives reboots."
echo ""
echo "  Manage with:"
echo "    sudo systemctl status $APP_NAME"
echo "    sudo systemctl restart $APP_NAME"
echo "    sudo systemctl stop $APP_NAME"
echo "    sudo journalctl -u $APP_NAME -f   (view live logs)"
echo ""
echo "========================================"
