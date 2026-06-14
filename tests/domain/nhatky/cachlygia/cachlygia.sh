#!/usr/bin/env bash
# Chạy toàn bộ test cách ly gia đình: function → api → integration
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../../../common.sh
source "${SCRIPT_DIR}/../../../common.sh"

FAILED=0

run_layer() {
  local name="$1"
  local script="$2"
  bold ""
  bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  bold "Lớp: $name"
  if bash "$script"; then
    green "✓ $name"
  else
    red "✗ $name"
    FAILED=1
  fi
}

bold "Cách ly gia đình — full suite (function + API + tích hợp)"
bold "API_URL=${API_URL}"

run_layer "FUNCTION" "${SCRIPT_DIR}/cachlygia-function.sh"
run_layer "API" "${SCRIPT_DIR}/cachlygia-api.sh"
run_layer "INTEGRATION" "${SCRIPT_DIR}/cachlygia-integration.sh"

bold ""
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$FAILED" -eq 0 ]]; then
  green "Cách ly gia đình: TẤT CẢ LỚP THÀNH CÔNG"
  exit 0
fi
red "Cách ly gia đình: CÓ LỚP THẤT BẠI"
exit 1
