#!/usr/bin/env bash
# Thư viện dùng chung cho tests/*.sh

set -euo pipefail

TESTS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${TESTS_ROOT}/.." && pwd)"

API_URL="${API_URL:-https://apinhatkyvumua.taho.cat/kho-thoc/}"
API_URL="${API_URL%/}/"

PASS_COUNT=0
FAIL_COUNT=0
CURRENT_SUITE=""

log()  { printf '\n\033[1;36m→ %s\033[0m\n' "$*"; }
pass() { PASS_COUNT=$((PASS_COUNT + 1)); printf '\033[1;32m  PASS\033[0m %s\n' "$1"; }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); printf '\033[1;31m  FAIL\033[0m %s\n' "$1"; [[ -n "${2:-}" ]] && printf '        %s\n' "$2"; }

reset_counters() {
  PASS_COUNT=0
  FAIL_COUNT=0
}

begin_suite() {
  CURRENT_SUITE="$1"
  log "Suite: ${CURRENT_SUITE}"
}

end_suite() {
  printf '\n\033[1m%s — %d pass, %d fail\033[0m\n' "${CURRENT_SUITE}" "${PASS_COUNT}" "${FAIL_COUNT}"
  [[ "${FAIL_COUNT}" -eq 0 ]]
}

api_get() {
  local query="$1"
  curl -sS "${API_URL}?${query}"
}

api_post() {
  local body="$1"
  curl -sS -w '\n%{http_code}' -X POST "${API_URL}" \
    -H 'Content-Type: application/json' \
    -d "${body}"
}

api_post_split() {
  local body="$1"
  local raw
  raw="$(api_post "${body}")"
  API_HTTP_BODY="${raw%$'\n'*}"
  API_HTTP_CODE="${raw##*$'\n'}"
}

assert_eq() {
  local id="$1" expected="$2" actual="$3"
  if [[ "${actual}" == "${expected}" ]]; then
    pass "${id}"
  else
    fail "${id}" "expected='${expected}' actual='${actual}'"
  fi
}

assert_contains() {
  local id="$1" needle="$2" haystack="$3"
  if [[ "${haystack}" == *"${needle}"* ]]; then
    pass "${id}"
  else
    fail "${id}" "missing '${needle}' in: ${haystack}"
  fi
}

assert_http() {
  local id="$1" expected="$2" actual="$3"
  assert_eq "${id}" "${expected}" "${actual}"
}

assert_file_contains() {
  local id="$1" needle="$2" file="$3"
  if grep -qF "${needle}" "${file}"; then
    pass "${id}"
  else
    fail "${id}" "file ${file} missing '${needle}'"
  fi
}

run_script() {
  local script="$1"
  bash "${script}"
}
