#!/usr/bin/env bash
# Test: đổi quà — bắt buộc mã xác nhận (type=redeem)
#
# ID test:
#   NK-DQ-01  Không cho ghi log REDEEM trực tiếp (type=log)
#   NK-DQ-02  Đổi quà thiếu passcode → lỗi
#   NK-DQ-03  Đổi quà sai passcode → 403

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../lib/common.sh
source "${SCRIPT_DIR}/../lib/common.sh"

bold "=== Đổi quà (passcode) ==="
bold "API: $API_URL"
bold ""

TEST_PROFILE_ID="p_test_dq_$$"
TEST_PROFILE_CREATED=0

cleanup_dq_profile() {
  if [[ "$TEST_PROFILE_CREATED" -eq 1 ]]; then
    split_body_status "$(api_post "$(json_encode delete_profile profileId "$TEST_PROFILE_ID")")"
  fi
}

trap cleanup_dq_profile EXIT

split_body_status "$(api_get '?type=profiles')"
PROFILE_ID="$(printf '%s' "$HTTP_BODY" | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  const list = Array.isArray(d.profiles) ? d.profiles : [];
  if (!list.length) process.exit(0);
  process.stdout.write(String(list[0].id || ''));
")"
PROFILE_NAME="$(printf '%s' "$HTTP_BODY" | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  const list = Array.isArray(d.profiles) ? d.profiles : [];
  if (!list.length) process.exit(0);
  process.stdout.write(String(list[0].name || 'Be test'));
")"

if [[ -z "$PROFILE_ID" ]]; then
  split_body_status "$(api_post "$(json_encode profile id "$TEST_PROFILE_ID" name "Be test doi qua" avatar "dq")")"
  if [[ "$HTTP_STATUS" == "200" ]] && printf '%s' "$HTTP_BODY" | grep -q '"result":"success"'; then
    PROFILE_ID="$TEST_PROFILE_ID"
    PROFILE_NAME="Be test doi qua"
    TEST_PROFILE_CREATED=1
    pass "setup — tạo bé tạm $TEST_PROFILE_ID"
  else
    skip "NK-DQ-01" "Không có profile và không tạo được bé tạm"
    skip "NK-DQ-02" "Không có profile"
    skip "NK-DQ-03" "Không có profile"
    print_summary
    exit 0
  fi
fi

# NK-DQ-01
split_body_status "$(api_post "$(json_encode log profileId "$PROFILE_ID" profileName "$PROFILE_NAME" date "2099-01-01 00:00" grain "-10" exp "0" tasks "REDEEM" bonus "false" note "test")")"
assert_http_status "NK-DQ-01" "403" "$HTTP_STATUS"
assert_json_field "NK-DQ-01" "$HTTP_BODY" "result" "error"
assert_json_contains "NK-DQ-01" "$HTTP_BODY" "mã xác nhận"

# NK-DQ-02
split_body_status "$(api_post "$(json_encode redeem profileId "$PROFILE_ID" profileName "$PROFILE_NAME" rewardIds '["r1"]' passcode "")")"
assert_http_status "NK-DQ-02" "400" "$HTTP_STATUS"
assert_json_field "NK-DQ-02" "$HTTP_BODY" "result" "error"
assert_json_contains "NK-DQ-02" "$HTTP_BODY" "mã xác nhận"

# NK-DQ-03
split_body_status "$(api_post "$(json_encode redeem profileId "$PROFILE_ID" profileName "$PROFILE_NAME" rewardIds '["r1"]' passcode "0000")")"
if [[ "$HTTP_STATUS" == "403" ]]; then
  pass "NK-DQ-03 — HTTP 403"
  assert_json_field "NK-DQ-03" "$HTTP_BODY" "result" "error"
else
  fail "NK-DQ-03 — HTTP $HTTP_STATUS (kỳ vọng 403)"
fi

print_summary
