#!/usr/bin/env bash
# NK-ISO-A* — Test API cách ly gia đình
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../../lib/common.sh
source "${SCRIPT_DIR}/../../lib/common.sh"

FAMILY_A="fam_test_api_a_$$"
FAMILY_B="fam_test_api_b_$$"
TEST_PROFILE_A="p_test_api_a_$$"
TEST_PROFILE_B="p_test_api_b_$$"
CREATED_A=0
CREATED_B=0

cleanup() {
  if [[ "$CREATED_A" -eq 1 ]]; then
    split_body_status "$(api_post_family "$FAMILY_A" "$(json_encode delete_profile profileId "$TEST_PROFILE_A")")"
  fi
  if [[ "$CREATED_B" -eq 1 ]]; then
    split_body_status "$(api_post_family "$FAMILY_B" "$(json_encode delete_profile profileId "$TEST_PROFILE_B")")"
  fi
}

trap cleanup EXIT

json_profile_count() {
  printf '%s' "$HTTP_BODY" | node -e "
    const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const list = Array.isArray(d.profiles) ? d.profiles : [];
    process.stdout.write(String(list.length));
  "
}

json_has_profile() {
  local pid="$1"
  printf '%s' "$HTTP_BODY" | node -e "
    const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const list = Array.isArray(d.profiles) ? d.profiles : [];
    const found = list.some(p => String(p.id) === process.argv[1]);
    process.stdout.write(found ? 'yes' : 'no');
  " "$pid"
}

bold "=== Cách ly gia đình — API ==="
bold "API: $API_URL"
bold ""

# NK-ISO-A01 — thiếu header
split_body_status "$(api_get_no_family '?type=profiles')"
assert_http_status "NK-ISO-A01" "400" "$HTTP_STATUS"
assert_json_contains "NK-ISO-A01" "$HTTP_BODY" "X-Family-Id"

# NK-ISO-A02 — gia đình mới danh sách trống
split_body_status "$(api_get_family "$FAMILY_B" '?type=profiles')"
assert_http_status "NK-ISO-A02" "200" "$HTTP_STATUS"
if [[ "$(json_profile_count)" == "0" ]]; then
  pass "NK-ISO-A02 — gia đình mới: 0 bé"
else
  fail "NK-ISO-A02 — gia đình mới thấy $(json_profile_count) bé (kỳ vọng 0)"
fi

# NK-ISO-A03 — tạo bé gia đình A
split_body_status "$(api_post_family "$FAMILY_A" "$(json_encode profile id "$TEST_PROFILE_A" name "Be API A" avatar "a")")"
assert_http_status "NK-ISO-A03" "200" "$HTTP_STATUS"
assert_json_field "NK-ISO-A03" "$HTTP_BODY" "result" "success"
if [[ "$HTTP_STATUS" == "200" ]]; then CREATED_A=1; fi

# NK-ISO-A04 — gia đình B không thấy bé A
split_body_status "$(api_get_family "$FAMILY_B" '?type=profiles')"
assert_http_status "NK-ISO-A04" "200" "$HTTP_STATUS"
if [[ "$(json_has_profile "$TEST_PROFILE_A")" == "no" ]]; then
  pass "NK-ISO-A04 — gia đình B không thấy bé của A"
else
  fail "NK-ISO-A04 — gia đình B thấy bé $TEST_PROFILE_A"
fi

# NK-ISO-A05 — gia đình A thấy bé của mình
split_body_status "$(api_get_family "$FAMILY_A" '?type=profiles')"
assert_http_status "NK-ISO-A05" "200" "$HTTP_STATUS"
if [[ "$(json_has_profile "$TEST_PROFILE_A")" == "yes" ]]; then
  pass "NK-ISO-A05 — gia đình A thấy bé của mình"
else
  fail "NK-ISO-A05 — gia đình A không thấy bé $TEST_PROFILE_A"
fi

# NK-ISO-A06 — gia đình B không ghi log vào bé A
split_body_status "$(api_post_family "$FAMILY_B" "$(json_encode log profileId "$TEST_PROFILE_A" profileName "Be API A" date "2099-06-14 10:00" grain "99" exp "1" tasks "t1" bonus "false" note "x")")"
if [[ "$HTTP_STATUS" == "404" ]] || [[ "$HTTP_STATUS" == "400" ]]; then
  pass "NK-ISO-A06 — HTTP $HTTP_STATUS (không ghi log bé gia đình khác)"
else
  fail "NK-ISO-A06 — HTTP $HTTP_STATUS (kỳ vọng 404/400)"
fi

# NK-ISO-A07 — gia đình B không xóa bé A
split_body_status "$(api_post_family "$FAMILY_B" "$(json_encode delete_profile profileId "$TEST_PROFILE_A")")"
if [[ "$HTTP_STATUS" == "200" ]]; then
  if printf '%s' "$HTTP_BODY" | grep -q '"result":"error"'; then
    pass "NK-ISO-A07 — không xóa được bé gia đình khác"
  else
    fail "NK-ISO-A07 — gia đình B xóa được bé A"
  fi
else
  pass "NK-ISO-A07 — HTTP $HTTP_STATUS (không xóa bé gia đình khác)"
fi

# NK-ISO-A08 — gia đình A vẫn còn bé sau khi B thử xóa
split_body_status "$(api_get_family "$FAMILY_A" '?type=profiles')"
if [[ "$(json_has_profile "$TEST_PROFILE_A")" == "yes" ]]; then
  pass "NK-ISO-A08 — bé A vẫn tồn tại sau thao tác của B"
else
  fail "NK-ISO-A08 — bé A bị mất sau thao tác của B"
fi

# NK-ISO-A09 — POST thiếu header
split_body_status "$(curl -sS -w '\n%{http_code}' -X POST "$(api_url '/')" \
  -H 'Content-Type: application/json' \
  --data-binary "$(json_encode profile id "${TEST_PROFILE_B}" name "hack" avatar "x")")"
assert_http_status "NK-ISO-A09" "400" "$HTTP_STATUS"

# NK-ISO-A10 — logs của A không lộ sang B (query theo profileId)
split_body_status "$(api_post_family "$FAMILY_A" "$(json_encode log profileId "$TEST_PROFILE_A" profileName "Be API A" date "2099-06-14 11:00" grain "5" exp "2" tasks "t2" bonus "false" note "log A")")"
if [[ "$HTTP_STATUS" == "200" ]]; then
  split_body_status "$(api_get_family "$FAMILY_B" "?type=logs&profileId=${TEST_PROFILE_A}")"
  LOG_COUNT="$(printf '%s' "$HTTP_BODY" | node -e "
    const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const n = Array.isArray(d.logs) ? d.logs.length : -1;
    process.stdout.write(String(n));
  ")"
  if [[ "$LOG_COUNT" == "0" ]]; then
    pass "NK-ISO-A10 — gia đình B không đọc được log bé A"
  else
    fail "NK-ISO-A10 — gia đình B thấy $LOG_COUNT log của bé A"
  fi
else
  skip "NK-ISO-A10" "Không ghi được log test cho bé A"
fi

print_summary
