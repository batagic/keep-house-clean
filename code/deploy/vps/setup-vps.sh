#!/usr/bin/env bash
# Chạy TRÊN VPS (một lần) — tạo thư mục /opt/nhatkyvumua
#
# Usage (trên VPS):
#   cd keep-house-clean/code/deploy/vps && sudo bash setup-vps.sh

set -euo pipefail

INSTALL_ROOT="/opt/nhatkyvumua"
REPO_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"

echo "→ Tạo $INSTALL_ROOT"
sudo mkdir -p "$INSTALL_ROOT/kho-thoc-api/data"

if [[ -d "$REPO_DIR/code/kho-thoc-api" ]]; then
  echo "→ Đồng bộ kho-thoc-api từ repo hiện tại"
  sudo rsync -a --delete \
    --exclude node_modules \
    --exclude .env \
    "$REPO_DIR/code/kho-thoc-api/" "$INSTALL_ROOT/kho-thoc-api/"
  if [[ -d "$REPO_DIR/docs/db/migrate" ]]; then
    sudo mkdir -p "$INSTALL_ROOT/kho-thoc-api/migrations"
    sudo rsync -a "$REPO_DIR/docs/db/migrate/" "$INSTALL_ROOT/kho-thoc-api/migrations/"
  fi
else
  echo "⚠️  Không thấy code/kho-thoc-api trong repo"
fi

sudo cp -n "$REPO_DIR/code/deploy/vps/.env.production.example" "$INSTALL_ROOT/kho-thoc-api/.env.example" 2>/dev/null || true

echo ""
echo "✅ Thư mục: $INSTALL_ROOT"
echo "   Tiếp theo: xem docs/technical/dev.md và docs/technical/operator.md"
