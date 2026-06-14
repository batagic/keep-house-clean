#!/usr/bin/env bash
# Test: đăng ký bé mới — giới hạn tối đa 3 bé / gia đình
#
# ID test:
#   NK-DKB-01  API ping
#   NK-DKB-02  Frontend config MAX_PROFILES_PER_FAMILY = 3
#   NK-DKB-03  Frontend kiểm tra giới hạn (isProfileLimitReached)
#   NK-DKB-04  Backend từ chối đăng ký bé thứ 4
#   NK-DKB-05  Backend vẫn cho cập nhật bé hiện có khi đã đủ 3

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../lib/common.sh
source "${SCRIPT_DIR}/../lib/common.sh"

TEST_PREFIX="p_test_dkb_$$"
CREATED_IDS=()

cleanup_test_profiles() {
  local id
  if [[ "${#CREATED_IDS[@]}" -eq 0 ]]; then
    return 0
  fi
  for id in "${CREATED_IDS[@]}"; do
    split_body_status "$(api_post "$(json_encode delete_profile profileId "$id")")"
  done
}

purge_profiles_by_prefix() {
  local prefix="$1"
  split_body_status "$(api_get '?type=profiles')"
  local ids
  ids="$(PREFIX="$prefix" printf '%s' "$HTTP_BODY" | node -e "
    const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const p = process.env.PREFIX || '';
    const list = Array.isArray(d.profiles) ? d.profiles : [];
    for (const row of list) {
      const id = String(row.id || '');
      if (id.startsWith(p)) console.log(id);
    }
  ")"
  local id
  while IFS= read -r id; do
    [[ -z "$id" ]] && continue
    split_body_status "$(api_post "$(json_encode delete_profile profileId "$id")")"
  done <<< "$ids"
}

create_test_profile() {
  local id="$1" name="$2"
  split_body_status "$(api_post "$(json_encode profile id "$id" name "$name" avatar "test")")"
  if [[ "$HTTP_STATUS" == "200" ]] && printf '%s' "$HTTP_BODY" | grep -q '"result":"success"'; then
    CREATED_IDS+=("$id")
    return 0
  fi
  return 1
}

count_profiles() {
  split_body_status "$(api_get '?type=profiles')"
  printf '%s' "$HTTP_BODY" | node -e "
    const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const n = Array.isArray(d.profiles) ? d.profiles.length : 0;
    process.stdout.write(String(n));
  "
}

count_non_test_profiles() {
  split_body_status "$(api_get '?type=profiles')"
  printf '%s' "$HTTP_BODY" | node -e "
    const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const list = Array.isArray(d.profiles) ? d.profiles : [];
    const n = list.filter(p => !String(p.id || '').startsWith('p_test_')).length;
    process.stdout.write(String(n));
  "
}

bold "=== Đăng ký bé mới (giới hạn 3 bé) ==="
bold "API: $API_URL"
bold ""

trap cleanup_test_profiles EXIT

purge_profiles_by_prefix "p_test_dkb_"

# NK-DKB-01
split_body_status "$(api_get '?type=ping')"
assert_http_status "NK-DKB-01" "200" "$HTTP_STATUS"
assert_json_field "NK-DKB-01" "$HTTP_BODY" "result" "ok"

# NK-DKB-02
assert_file_contains \
  "NK-DKB-02 — config.js có MAX_PROFILES_PER_FAMILY = 3" \
  "${REPO_ROOT}/assets/js/data/config.js" \
  "MAX_PROFILES_PER_FAMILY = 3"

# NK-DKB-03
assert_file_contains \
  "NK-DKB-03 — nhat-ky.js kiểm tra isProfileLimitReached" \
  "${REPO_ROOT}/assets/js/pages/nhat-ky.js" \
  "isProfileLimitReached()"

assert_file_contains \
  "NK-DKB-03 — nhat-ky.html có addProfileBtn" \
  "${REPO_ROOT}/nhat-ky.html" \
  'id="addProfileBtn"'

# NK-DKB-04 — đảm bảo đủ 3 bé rồi thử tạo bé thứ 4
REAL_COUNT="$(count_non_test_profiles)"
TOTAL="$(count_profiles)"
SLOTS=$((3 - TOTAL))
if [[ "$SLOTS" -lt 0 ]]; then SLOTS=0; fi

bold ""
bold "→ Chuẩn bị dữ liệu test (tổng: $TOTAL, bé thật: $REAL_COUNT, cần tạo thêm: $SLOTS)"

i=1
while [[ "$i" -le "$SLOTS" ]]; do
  tid="${TEST_PREFIX}_${i}"
  if create_test_profile "$tid" "Bé test $i"; then
    pass "setup — tạo $tid"
  else
    fail "setup — không tạo được $tid" "HTTP $HTTP_STATUS — $HTTP_BODY"
    break
  fi
  i=$((i + 1))
done

TOTAL="$(count_profiles)"
if [[ "$TOTAL" -lt 3 ]]; then
  skip "NK-DKB-04" "Chỉ có $TOTAL bé — không đủ 3 để kiểm tra giới hạn (cần dữ liệu hoặc quyền tạo thêm)"
else
  split_body_status "$(api_post "$(json_encode profile id "${TEST_PREFIX}_overflow" name "Be thu 4" avatar "no")")"
  assert_http_status "NK-DKB-04" "400" "$HTTP_STATUS"
  assert_json_field "NK-DKB-04" "$HTTP_BODY" "result" "error"
  assert_json_contains "NK-DKB-04" "$HTTP_BODY" "Mỗi gia đình chỉ đăng ký tối đa 3 bé"
fi

# NK-DKB-05 — cập nhật bé test (không đổi tên bé thật)
if [[ "${#CREATED_IDS[@]}" -eq 0 ]]; then
  skip "NK-DKB-05" "Không có bé test để thử cập nhật (tránh sửa bé thật)"
else
  UPDATE_ID="${CREATED_IDS[0]}"
  split_body_status "$(api_post "$(json_encode profile id "$UPDATE_ID" name "Be test cap nhat" avatar "upd")")"
  assert_http_status "NK-DKB-05" "200" "$HTTP_STATUS"
  assert_json_field "NK-DKB-05" "$HTTP_BODY" "result" "success"
  assert_json_field "NK-DKB-05" "$HTTP_BODY" "action" "updated"
fi

print_summary
