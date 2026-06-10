#!/usr/bin/env bash
# Bước deploy API trên VPS — được gọi tự động bởi deploy.sh (Mac).
# Có thể chạy tay trên VPS: bash /opt/nhatkyvumua/repo/deploy/vps/deploy-api.sh
#
# Biến môi trường:
#   SKIP_GIT_PULL=1     Bỏ qua git pull (mặc định khi rsync từ Mac)
#   VERIFY_PATTERN=...  Grep xác nhận code mới (tuỳ chọn, để trống = bỏ qua)

set -euo pipefail

INSTALL_ROOT="${INSTALL_ROOT:-/opt/nhatkyvumua}"
REPO_DIR="${INSTALL_ROOT}/repo"
API_DIR="${INSTALL_ROOT}/kho-thoc-api"
VERIFY_PATTERN="${VERIFY_PATTERN:-}"

cd "${INSTALL_ROOT}"

if [[ "${SKIP_GIT_PULL:-0}" != "1" ]] && [[ -d "${REPO_DIR}/.git" ]]; then
  echo "→ git pull"
  git -c "safe.directory=${REPO_DIR}" -C "${REPO_DIR}" pull origin main
fi

if [[ ! -d "${REPO_DIR}/kho-thoc-api" ]]; then
  echo "❌ Không thấy ${REPO_DIR}/kho-thoc-api"
  exit 1
fi

echo "→ rsync kho-thoc-api"
rsync -a "${REPO_DIR}/kho-thoc-api/" "${API_DIR}/" \
  --exclude .env --exclude data --exclude node_modules

if [[ -n "${VERIFY_PATTERN}" ]]; then
  echo "→ xác nhận code: ${VERIFY_PATTERN}"
  if ! grep -rq "${VERIFY_PATTERN}" "${API_DIR}/src/"; then
    echo "❌ Không tìm thấy '${VERIFY_PATTERN}' trong ${API_DIR}/src/"
    exit 1
  fi
  grep -rn "${VERIFY_PATTERN}" "${API_DIR}/src/" | head -5
fi

echo "→ docker compose build + recreate"
cd "${API_DIR}"
docker compose up -d --build --force-recreate

if [[ -n "${VERIFY_PATTERN}" ]]; then
  echo "→ xác nhận trong container"
  docker compose exec -T kho-thoc-api grep -rn "${VERIFY_PATTERN}" /app/src/ | head -5
fi

echo "→ ping API local"
curl -sf "http://127.0.0.1:3001/kho-thoc/?type=ping"
echo ""

echo "✅ API container đã chạy"
