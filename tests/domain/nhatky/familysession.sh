#!/usr/bin/env bash
# Test: phiên gia đình — unlock_family + bootstrap (Phase 3.1)
#
# ID test: NK-SES-02 … NK-SES-07 (xem tests/test-case.md)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../../common.sh
source "${SCRIPT_DIR}/../../common.sh"

bold "=== Phiên gia đình (unlock_family) ==="
bold "API: $API_URL"
bold ""

TEST_PROFILE_ID="p_test_ses_$$"
TEST_FAMILY_ID=""
TEST_PASSCODE=""
TEST_PROFILE_CREATED=0

cleanup_session_profile() {
  if [[ "$TEST_PROFILE_CREATED" -eq 1 && -n "$TEST_FAMILY_ID" ]]; then
    split_body_status "$(api_post_family "$TEST_FAMILY_ID" "$(json_encode delete_profile profileId "$TEST_PROFILE_ID")")"
  fi
}

trap cleanup_session_profile EXIT

# NK-SES-07 — bootstrap: đăng ký bé đầu không cần X-Family-Id
split_body_status "$(api_post_no_family "$(json_encode profile id "$TEST_PROFILE_ID" name "Be test session" avatar "ses")")"
assert_http_status "NK-SES-07" "200" "$HTTP_STATUS"
assert_json_field "NK-SES-07" "$HTTP_BODY" "result" "success"
assert_json_contains "NK-SES-07" "$HTTP_BODY" "passcode"
assert_json_contains "NK-SES-07" "$HTTP_BODY" "familyId"

TEST_FAMILY_ID="$(printf '%s' "$HTTP_BODY" | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  process.stdout.write(String(d.familyId || ''));
")"
TEST_PASSCODE="$(printf '%s' "$HTTP_BODY" | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  process.stdout.write(String(d.passcode || ''));
")"

if [[ -n "$TEST_FAMILY_ID" && -n "$TEST_PASSCODE" ]]; then
  TEST_PROFILE_CREATED=1
  pass "NK-SES-07 — bootstrap trả familyId + passcode"
else
  fail "NK-SES-07 — thiếu familyId hoặc passcode trong response"
fi

# NK-SES-03 — unlock sai mã
split_body_status "$(api_post_no_family "$(json_encode unlock_family passcode "0000")")"
assert_http_status "NK-SES-03" "403" "$HTTP_STATUS"

# NK-SES-02 — unlock đúng mã
split_body_status "$(api_post_no_family "$(json_encode unlock_family passcode "$TEST_PASSCODE")")"
assert_http_status "NK-SES-02" "200" "$HTTP_STATUS"
assert_json_field "NK-SES-02" "$HTTP_BODY" "result" "success"
assert_json_field "NK-SES-02" "$HTTP_BODY" "familyId" "$TEST_FAMILY_ID"

# NK-SES-04 — sau unlock, GET profiles đúng gia đình
split_body_status "$(api_get_family "$TEST_FAMILY_ID" '?type=profiles')"
assert_http_status "NK-SES-04" "200" "$HTTP_STATUS"
if printf '%s' "$HTTP_BODY" | grep -qF "$TEST_PROFILE_ID"; then
  pass "NK-SES-04 — thấy bé vừa tạo"
else
  fail "NK-SES-04 — không thấy $TEST_PROFILE_ID"
fi

# NK-SES-05 — ghi log không cần passcode body
split_body_status "$(api_post_family "$TEST_FAMILY_ID" "$(json_encode log profileId "$TEST_PROFILE_ID" profileName "Be test session" date "2099-01-01 10:00" grain 10 exp 5 tasks t7 bonus false note "test ses")")"
assert_http_status "NK-SES-05" "200" "$HTTP_STATUS"
assert_json_field "NK-SES-05" "$HTTP_BODY" "result" "success"

# NK-SES-06 — redeem vẫn bắt buộc passcode
split_body_status "$(api_post_family "$TEST_FAMILY_ID" "$(json_encode redeem profileId "$TEST_PROFILE_ID" profileName "Be test session" rewardIds "[\"r7\"]")")"
assert_http_status "NK-SES-06" "400" "$HTTP_STATUS"

print_summary
