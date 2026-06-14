#!/usr/bin/env bash
# Thư viện dùng chung cho script test API / frontend (docs/tests/)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CODE_ROOT="${CODE_ROOT:-${REPO_ROOT}/code}"
DOCS_DB="${DOCS_DB:-${REPO_ROOT}/docs/db}"
API_URL="${API_URL:-https://apinhatkyvumua.taho.cat/kho-thoc/}"
FAMILY_ID="${FAMILY_ID:-fam_test_$$}"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[1;33m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  green "  PASS  $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  red "  FAIL  $1"
  [[ -n "${2:-}" ]] && red "        $2"
}

skip() {
  SKIP_COUNT=$((SKIP_COUNT + 1))
  yellow "  SKIP  $1"
  [[ -n "${2:-}" ]] && yellow "        $2"
}

api_url() {
  local path="$1"
  local base="${API_URL%/}/"
  printf '%s%s' "$base" "${path#/}"
}

api_get() {
  curl -sS -w '\n%{http_code}' "$(api_url "$1")" \
    -H "X-Family-Id: ${FAMILY_ID}"
}

api_get_no_family() {
  curl -sS -w '\n%{http_code}' "$(api_url "$1")"
}

api_post() {
  local payload="$1"
  curl -sS -w '\n%{http_code}' -X POST "$(api_url '/')" \
    -H 'Content-Type: application/json; charset=utf-8' \
    -H "X-Family-Id: ${FAMILY_ID}" \
    --data-binary "$payload"
}

api_post_family() {
  local family_id="$1"
  local payload="$2"
  curl -sS -w '\n%{http_code}' -X POST "$(api_url '/')" \
    -H 'Content-Type: application/json; charset=utf-8' \
    -H "X-Family-Id: ${family_id}" \
    --data-binary "$payload"
}

api_get_family() {
  local family_id="$1"
  local path="$2"
  curl -sS -w '\n%{http_code}' "$(api_url "$path")" \
    -H "X-Family-Id: ${family_id}"
}

json_encode() {
  node -e '
    const [type, ...rest] = process.argv.slice(1);
    const obj = { type };
    const keepString = new Set([
      "id", "profileId", "profileName", "name", "avatar", "date",
      "tasks", "note", "passcode", "action"
    ]);
    for (let i = 0; i < rest.length; i += 2) {
      const key = rest[i];
      let val = rest[i + 1];
      if (val === "true") val = true;
      else if (val === "false") val = false;
      else if ((val.startsWith("[") && val.endsWith("]")) || (val.startsWith("{") && val.endsWith("}"))) {
        try { val = JSON.parse(val); } catch { /* giữ string */ }
      } else if (!keepString.has(key) && val !== "" && !Number.isNaN(Number(val))) {
        val = Number(val);
      }
      obj[key] = val;
    }
    process.stdout.write(JSON.stringify(obj));
  ' "$@"
}

split_body_status() {
  local raw="$1"
  HTTP_STATUS="${raw##*$'\n'}"
  HTTP_BODY="${raw%$'\n'*}"
}

assert_http_status() {
  local id="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    pass "$id — HTTP $actual"
  else
    fail "$id — HTTP $actual (kỳ vọng $expected)"
  fi
}

assert_json_field() {
  local id="$1" json="$2" field="$3" expected="$4"
  local actual
  actual="$(printf '%s' "$json" | node -e "
    const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const v = d[process.argv[1]];
    process.stdout.write(v === undefined || v === null ? '' : String(v));
  " "$field" 2>/dev/null || true)"
  if [[ "$actual" == "$expected" ]]; then
    pass "$id — $field = $expected"
  else
    fail "$id — $field = '$actual' (kỳ vọng '$expected')"
  fi
}

assert_json_contains() {
  local id="$1" json="$2" needle="$3"
  if printf '%s' "$json" | grep -qF "$needle"; then
    pass "$id — chứa '$needle'"
  else
    fail "$id — không thấy '$needle' trong response"
  fi
}

assert_file_contains() {
  local id="$1" file="$2" needle="$3"
  if grep -qF "$needle" "$file"; then
    pass "$id"
  else
    fail "$id — không tìm thấy '$needle' trong $file"
  fi
}

print_summary() {
  bold ""
  bold "Tổng kết: PASS=$PASS_COUNT FAIL=$FAIL_COUNT SKIP=$SKIP_COUNT"
  if [[ "$FAIL_COUNT" -gt 0 ]]; then
    red "Kết quả: THẤT BẠI"
    return 1
  fi
  green "Kết quả: THÀNH CÔNG"
  return 0
}
