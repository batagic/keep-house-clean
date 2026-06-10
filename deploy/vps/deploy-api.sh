#!/usr/bin/env bash
# Deploy API mới lên VPS — chạy TRÊN VPS sau khi git push (hoặc rsync) code mới.
#
# Usage (trên VPS):
#   cd /opt/nhatkyvumua && bash repo/deploy/vps/deploy-api.sh
#
# Tuỳ chọn — chỉ kiểm tra code đã có delete_profile:
#   VERIFY_PATTERN=delete_profile bash repo/deploy/vps/deploy-api.sh

set -euo pipefail

INSTALL_ROOT="${INSTALL_ROOT:-/opt/nhatkyvumua}"
REPO_DIR="${INSTALL_ROOT}/repo"
API_DIR="${INSTALL_ROOT}/kho-thoc-api"
VERIFY_PATTERN="${VERIFY_PATTERN:-delete_profile}"

cd "${INSTALL_ROOT}"

if [[ -d "${REPO_DIR}/.git" ]]; then
  echo "→ git pull"
  git -C "${REPO_DIR}" pull origin main
else
  echo "⚠️  Không thấy ${REPO_DIR}/.git — bỏ qua git pull (dùng rsync từ Mac?)"
fi

if [[ -d "${REPO_DIR}/kho-thoc-api" ]]; then
  echo "→ rsync kho-thoc-api"
  rsync -a "${REPO_DIR}/kho-thoc-api/" "${API_DIR}/" \
    --exclude .env --exclude data --exclude node_modules
fi

echo "→ xác nhận code trên đĩa"
if ! grep -rq "${VERIFY_PATTERN}" "${API_DIR}/src/"; then
  echo "❌ Không tìm thấy '${VERIFY_PATTERN}' trong ${API_DIR}/src/"
  echo "   Kiểm tra: git push từ Mac đã xong chưa?"
  exit 1
fi
grep -rn "${VERIFY_PATTERN}" "${API_DIR}/src/" | head -5

echo "→ docker compose build + recreate"
cd "${API_DIR}"
docker compose up -d --build --force-recreate

echo "→ xác nhận code trong container"
docker compose exec -T kho-thoc-api grep -rn "${VERIFY_PATTERN}" /app/src/ | head -5

echo "→ ping API"
curl -sf "http://127.0.0.1:3001/kho-thoc/?type=ping" | head -c 200
echo ""

echo "✅ Deploy API xong. Test HTTPS từ Mac:"
echo "   curl -s 'https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping'"
