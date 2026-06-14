#!/usr/bin/env bash
# Chạy toàn bộ test domain Nhật Ký (docs/tests/domain/nhatky/)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../../common.sh
source "${SCRIPT_DIR}/../../common.sh"

FAILED=0

run_suite() {
  local script="$1"
  bold ""
  bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if bash "$script"; then
    green "✓ $(basename "$script")"
  else
    red "✗ $(basename "$script")"
    FAILED=1
  fi
}

bold "Nhật Ký Vụ Mùa — test suite"
bold "API_URL=${API_URL}"

run_suite "${SCRIPT_DIR}/familysession-function.sh"
run_suite "${SCRIPT_DIR}/familysession.sh"
run_suite "${SCRIPT_DIR}/doiqua.sh"
run_suite "${SCRIPT_DIR}/dangkybe.sh"
run_suite "${SCRIPT_DIR}/cachlygia.sh"

bold ""
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$FAILED" -eq 0 ]]; then
  green "Tất cả suite nhật ký: THÀNH CÔNG"
  exit 0
fi
red "Có suite thất bại — xem log phía trên"
exit 1
