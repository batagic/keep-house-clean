#!/usr/bin/env bash
# Đồng bộ SQL migrate: code/kho-thoc-api/migrations → docs/db/migrate
# Chạy sau mỗi lần thêm file migration mới (trước commit).
set -euo pipefail
API_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "${API_DIR}/../.." && pwd)"
SRC="${API_DIR}/migrations"
DST="${REPO_ROOT}/docs/db/migrate"
mkdir -p "$DST"
rsync -a --delete "${SRC}/" "${DST}/"
echo "Synced migrations → ${DST}"
