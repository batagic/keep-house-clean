#!/usr/bin/env bash
# Chạy toàn bộ domain test (coverage tổng hợp)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

FAILED=0

for domain_runner in "${SCRIPT_DIR}"/domain/*/; do
  [[ -d "$domain_runner" ]] || continue
  runner="${domain_runner%/}.sh"
  [[ -f "$runner" ]] || runner="${domain_runner}$(basename "${domain_runner%/}").sh"
  [[ -f "$runner" ]] || continue
  bold ""
  bold "Domain: $(basename "${domain_runner%/}")"
  if bash "$runner"; then
    green "✓ $(basename "$runner")"
  else
    red "✗ $(basename "$runner")"
    FAILED=1
  fi
done

[[ "$FAILED" -eq 0 ]]
