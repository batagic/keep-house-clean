#!/usr/bin/env bash
# NK-ISO-I* — Test tích hợp luồng cách ly gia đình (end-to-end qua API)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../../../common.sh
source "${SCRIPT_DIR}/../../../common.sh"

FAMILY_NEW="fam_test_int_new_$$"
FAMILY_OTHER="fam_test_int_other_$$"
PROFILE_NEW="p_test_int_new_$$"
PROFILE_OTHER="p_test_int_other_$$"
CREATED_NEW=0
CREATED_OTHER=0

cleanup() {
  if [[ "$CREATED_NEW" -eq 1 ]]; then
    split_body_status "$(api_post_family "$FAMILY_NEW" "$(json_encode delete_profile profileId "$PROFILE_NEW")")"
  fi
  if [[ "$CREATED_OTHER" -eq 1 ]]; then
    split_body_status "$(api_post_family "$FAMILY_OTHER" "$(json_encode delete_profile profileId "$PROFILE_OTHER")")"
  fi
}

trap cleanup EXIT

profile_ids_json() {
  printf '%s' "$HTTP_BODY" | node -e "
    const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const list = Array.isArray(d.profiles) ? d.profiles : [];
    process.stdout.write(JSON.stringify(list.map(p => String(p.id || ''))));
  "
}

bold "=== Cách ly gia đình — TÍCH HỢP ==="
bold "API: $API_URL"
bold ""

# NK-ISO-I01 — gia đình mới: trống → đăng ký bé → chỉ thấy bé mình
split_body_status "$(api_get_family "$FAMILY_NEW" '?type=profiles')"
assert_http_status "NK-ISO-I01a" "200" "$HTTP_STATUS"
COUNT_BEFORE="$(printf '%s' "$HTTP_BODY" | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  process.stdout.write(String((d.profiles || []).length));
")"
if [[ "$COUNT_BEFORE" == "0" ]]; then
  pass "NK-ISO-I01a — gia đình mới chưa có bé"
else
  fail "NK-ISO-I01a — gia đình mới thấy $COUNT_BEFORE bé (kỳ vọng 0)"
fi

split_body_status "$(api_post_family "$FAMILY_NEW" "$(json_encode profile id "$PROFILE_NEW" name "Be tich hop" avatar "int")")"
assert_http_status "NK-ISO-I01b" "200" "$HTTP_STATUS"
assert_json_field "NK-ISO-I01b" "$HTTP_BODY" "action" "inserted"
CREATED_NEW=1

split_body_status "$(api_get_family "$FAMILY_NEW" '?type=profiles')"
IDS="$(profile_ids_json)"
if [[ "$IDS" == "[\"$PROFILE_NEW\"]" ]]; then
  pass "NK-ISO-I01c — sau đăng ký chỉ thấy đúng 1 bé của mình"
else
  fail "NK-ISO-I01c — danh sách bé: $IDS (kỳ vọng [\"$PROFILE_NEW\"])"
fi

# NK-ISO-I02 — hai gia đình độc lập, mỗi bên chỉ thấy bé của mình
split_body_status "$(api_post_family "$FAMILY_OTHER" "$(json_encode profile id "$PROFILE_OTHER" name "Be gia dinh khac" avatar "oth")")"
assert_http_status "NK-ISO-I02a" "200" "$HTTP_STATUS"
CREATED_OTHER=1

split_body_status "$(api_get_family "$FAMILY_NEW" '?type=profiles')"
IDS_NEW="$(profile_ids_json)"
split_body_status "$(api_get_family "$FAMILY_OTHER" '?type=profiles')"
IDS_OTHER="$(profile_ids_json)"

if [[ "$IDS_NEW" == "[\"$PROFILE_NEW\"]" ]] && [[ "$IDS_OTHER" == "[\"$PROFILE_OTHER\"]" ]]; then
  pass "NK-ISO-I02 — hai gia đình chỉ thấy bé của nhau"
else
  fail "NK-ISO-I02 — NEW=$IDS_NEW OTHER=$IDS_OTHER"
fi

# NK-ISO-I03 — ghi nhật ký + đọc lại chỉ trong gia đình
LOG_DATE="2099-06-14 14:00"
split_body_status "$(api_post_family "$FAMILY_NEW" "$(json_encode log profileId "$PROFILE_NEW" profileName "Be tich hop" date "$LOG_DATE" grain "15" exp "3" tasks "t3" bonus "true" note "int log")")"
assert_http_status "NK-ISO-I03a" "200" "$HTTP_STATUS"

split_body_status "$(api_get_family "$FAMILY_NEW" "?type=logs&profileId=${PROFILE_NEW}")"
HAS_LOG="$(printf '%s' "$HTTP_BODY" | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  const logs = Array.isArray(d.logs) ? d.logs : [];
  const ok = logs.some(l => String(l.grain) === '15' && String(l.note || '').includes('int log'));
  process.stdout.write(ok ? 'yes' : 'no');
")"
if [[ "$HAS_LOG" == "yes" ]]; then
  pass "NK-ISO-I03b — gia đình A đọc được log của bé mình"
else
  fail "NK-ISO-I03b — gia đình A không thấy log vừa ghi"
fi

split_body_status "$(api_get_family "$FAMILY_OTHER" "?type=logs&profileId=${PROFILE_NEW}")"
LOG_OTHER="$(printf '%s' "$HTTP_BODY" | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  process.stdout.write(String((d.logs || []).length));
")"
if [[ "$LOG_OTHER" == "0" ]]; then
  pass "NK-ISO-I03c — gia đình B không đọc log bé A"
else
  fail "NK-ISO-I03c — gia đình B thấy $LOG_OTHER log của bé A"
fi

# NK-ISO-I04 — giới hạn 3 bé tính theo gia đình (không ảnh hưởng gia đình khác)
P1="p_test_int_lim1_$$"
P2="p_test_int_lim2_$$"
P3="p_test_int_lim3_$$"
P4="p_test_int_lim4_$$"
FAMILY_LIMIT="fam_test_int_limit_$$"

cleanup_limit() {
  for id in "$P1" "$P2" "$P3" "$P4"; do
    split_body_status "$(api_post_family "$FAMILY_LIMIT" "$(json_encode delete_profile profileId "$id")")" || true
  done
}

api_post_family "$FAMILY_LIMIT" "$(json_encode profile id "$P1" name "L1" avatar "1")" >/dev/null || true
api_post_family "$FAMILY_LIMIT" "$(json_encode profile id "$P2" name "L2" avatar "2")" >/dev/null || true
api_post_family "$FAMILY_LIMIT" "$(json_encode profile id "$P3" name "L3" avatar "3")" >/dev/null || true

split_body_status "$(api_post_family "$FAMILY_LIMIT" "$(json_encode profile id "$P4" name "L4" avatar "4")")"
if [[ "$HTTP_STATUS" == "400" ]] && printf '%s' "$HTTP_BODY" | grep -q 'tối đa 3 bé'; then
  pass "NK-ISO-I04 — gia đình riêng bị chặn bé thứ 4"
else
  fail "NK-ISO-I04 — HTTP $HTTP_STATUS (kỳ vọng 400 giới hạn 3 bé)"
fi

# Gia đình NEW vẫn chỉ có 1 bé (giới hạn của FAMILY_LIMIT không ảnh hưởng)
split_body_status "$(api_get_family "$FAMILY_NEW" '?type=profiles')"
COUNT_NEW="$(printf '%s' "$HTTP_BODY" | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  process.stdout.write(String((d.profiles || []).length));
")"
if [[ "$COUNT_NEW" == "1" ]]; then
  pass "NK-ISO-I04b — giới hạn 3 bé không ảnh hưởng gia đình khác"
else
  fail "NK-ISO-I04b — gia đình NEW có $COUNT_NEW bé (kỳ vọng 1)"
fi

cleanup_limit

print_summary
