# Hướng dẫn chạy test

Script test tự động cho **Nhật Ký Vụ Mùa** (`nhat-ky.html`) và API `kho-thoc`.

## Cấu trúc thư mục

```
docs/tests/                 # Root test
docs/tests/lib/
  common.sh                 # Hàm dùng chung (curl, assert, tổng kết)
docs/tests/nhatky/          # Test màn Nhật Ký
  cachlygia.sh              # Cách ly gia đình — chạy function + API + tích hợp
  cachlygia/
    function.sh             # NK-ISO-F* — test function (node --test)
    function.test.mjs
    api.sh                  # NK-ISO-A* — test API
    integration.sh          # NK-ISO-I* — test tích hợp
    run.sh
  dangkybe.sh               # Đăng ký bé — giới hạn 3 bé / gia đình
  doiqua.sh                 # Đổi quà — bắt buộc passcode
  nhatky.sh                 # Chạy tất cả test nhật ký
docs/tests/test-case.md     # Bảng ID test chi tiết
```

## Yêu cầu

- `bash`, `curl`, `node` (để parse JSON)
- API đang chạy (mặc định production hoặc local)

## Chạy nhanh

Từ thư mục gốc repo:

```bash
# Toàn bộ test Nhật Ký (đổi quà trước, đăng ký bé sau — tránh xóa hết profile giữa chừng)
bash docs/tests/nhatky/nhatky.sh

# Chỉ test đăng ký bé (giới hạn 3)
bash docs/tests/nhatky/dangkybe.sh

# Chỉ test đổi quà
bash docs/tests/nhatky/doiqua.sh
# Chỉ test cách ly gia đình
bash docs/tests/nhatky/cachlygia.sh
```

## Chạy với API local

```bash
API_URL='http://localhost:3001/kho-thoc/' bash docs/tests/nhatky/nhatky.sh
```

Hoặc export trước:

```bash
export API_URL='http://localhost:3001/kho-thoc/'
bash docs/tests/nhatky/dangkybe.sh
```

## Chạy với API production (mặc định)

Không cần đặt biến — mặc định:

```
https://apinhatkyvumua.taho.cat/kho-thoc/
```

```bash
bash docs/tests/nhatky/nhatky.sh
```

## ID test — đăng ký bé (`dangkybe.sh`)

| ID | Mô tả | Kỳ vọng |
|----|--------|---------|
| NK-DKB-01 | API ping | HTTP 200, `result: ok` |
| NK-DKB-02 | Frontend `config.js` | `MAX_PROFILES_PER_FAMILY = 3` |
| NK-DKB-03 | Frontend UI / logic | `isProfileLimitReached`, `addProfileBtn` |
| NK-DKB-04 | Backend từ chối bé thứ 4 | HTTP 400, message giới hạn 3 bé |
| NK-DKB-05 | Cập nhật bé hiện có khi đủ 3 | HTTP 200, `action: updated` |

**Lưu ý NK-DKB-04:** Script tạo bé test (`p_test_dkb_*`) để lấp đủ 3 slot (theo tổng số bé hiện có **trong cùng family_id test**), thử tạo bé thứ 4, rồi **xóa sạch bé `p_test_dkb_*`** khi kết thúc. Không xóa bé thật.

## ID test — cách ly gia đình (`cachlygia/`)

Ba lớp: **function** → **api** → **integration**. Chi tiết đầy đủ: [test-case.md](tests/test-case.md).

| Lớp | Script | ID prefix |
|-----|--------|-----------|
| Function | `cachlygia/function.sh` | NK-ISO-F01 … F12 |
| API | `cachlygia/api.sh` | NK-ISO-A01 … A10 |
| Tích hợp | `cachlygia/integration.sh` | NK-ISO-I01 … I04 |

**Tiên quyết API:** migration `004_family_id.sql` đã chạy trên server.

## ID test — đổi quà (`doiqua.sh`)

| ID | Mô tả | Kỳ vọng |
|----|--------|---------|
| NK-DQ-01 | Ghi log `REDEEM` trực tiếp | HTTP 403 |
| NK-DQ-02 | `type=redeem` thiếu passcode | HTTP 400 |
| NK-DQ-03 | `type=redeem` sai passcode | HTTP 403 |

## Đọc kết quả

Mỗi script in:

- `PASS` — đạt
- `FAIL` — không đạt
- `SKIP` — bỏ qua (thiếu dữ liệu / điều kiện)

Dòng cuối: `Kết quả: THÀNH CÔNG` hoặc `THẤT BẠI`.

Exit code: `0` = pass, `1` = có lỗi.
