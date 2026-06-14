#!/usr/bin/env bash
# Đồng bộ SQL migrate từ docs/db/migrate → code/kho-thoc-api/migrations (cho Docker build)
set -euo pipefail
API_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "${API_DIR}/../.." && pwd)"
SRC="${REPO_ROOT}/docs/db/migrate"
DST="${API_DIR}/migrations"
mkdir -p "$DST"
rsync -a --delete "${SRC}/" "${DST}/"
echo "Synced migrations → ${DST}"
