#!/usr/bin/env bash
# Deploy API từ Mac → VPS (rsync + chạy deploy-api.sh trên server).
#
# Usage (trên Mac, cần SSH key tới VPS):
#   bash deploy/vps/deploy-from-mac.sh
#
# Tuỳ chọn:
#   VPS_HOST=root@64.176.85.165 bash deploy/vps/deploy-from-mac.sh

set -euo pipefail

VPS_HOST="${VPS_HOST:-root@64.176.85.165}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REMOTE_ROOT="/opt/nhatkyvumua"

echo "→ rsync repo lên ${VPS_HOST}:${REMOTE_ROOT}/repo/"
ssh "${VPS_HOST}" "mkdir -p ${REMOTE_ROOT}/repo"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .env \
  --exclude .git/objects \
  "${REPO_ROOT}/" "${VPS_HOST}:${REMOTE_ROOT}/repo/"

echo "→ chạy deploy-api.sh trên VPS"
ssh "${VPS_HOST}" "bash ${REMOTE_ROOT}/repo/deploy/vps/deploy-api.sh"
