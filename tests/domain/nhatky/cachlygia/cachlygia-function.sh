#!/usr/bin/env bash
# NK-ISO-F* — Test function (logic JS + middleware, không cần API)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../../../common.sh
source "${SCRIPT_DIR}/../../../common.sh"

bold "=== Cách ly gia đình — FUNCTION ==="
bold ""

TEST_FILE="${SCRIPT_DIR}/cachlygia-function.test.mjs"

if node --test "$TEST_FILE"; then
  pass "NK-ISO-F suite — node --test cachlygia-function.test.mjs"
else
  fail "NK-ISO-F suite — node --test cachlygia-function.test.mjs"
fi

assert_file_contains \
  "NK-ISO-F11 — nhat-ky.html load family-api.js" \
  "${CODE_ROOT}/nhat-ky.html" \
  'assets/js/shared/family-api.js'

assert_file_contains \
  "NK-ISO-F12 — migration 004_family_id.sql" \
  "${CODE_ROOT}/kho-thoc-api/migrations/004_family_id.sql" \
  'family_id'

print_summary
