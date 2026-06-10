#!/usr/bin/env bash
# Chạy TRÊN VPS (một lần) — tạo thư mục /opt/nhatkyvumua
#
# Usage (trên VPS):
#   curl -sO ... hoặc git clone repo trước, rồi:
#   cd keep-house-clean/deploy/vps && sudo bash setup-vps.sh

set -euo pipefail

INSTALL_ROOT="/opt/nhatkyvumua"
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "→ Tạo $INSTALL_ROOT"
sudo mkdir -p "$INSTALL_ROOT/kho-thoc-api/data"

if [[ -d "$REPO_DIR/kho-thoc-api" ]]; then
  echo "→ Đồng bộ kho-thoc-api từ repo hiện tại"
  sudo rsync -a --delete \
    --exclude node_modules \
    --exclude .env \
    "$REPO_DIR/kho-thoc-api/" "$INSTALL_ROOT/kho-thoc-api/"
else
  echo "⚠️  Không thấy kho-thoc-api trong repo — clone thủ công vào $INSTALL_ROOT/kho-thoc-api"
fi

sudo cp -n "$REPO_DIR/deploy/vps/.env.production.example" "$INSTALL_ROOT/kho-thoc-api/.env.example" 2>/dev/null || true

echo ""
echo "✅ Thư mục: $INSTALL_ROOT"
echo "   Tiếp theo: xem deploy/vps/HUONG-DAN-DEPLOY-VPS.md"
