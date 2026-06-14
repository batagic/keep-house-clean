# Hướng dẫn chạy test

Script test tự động cho **Nhật Ký Vụ Mùa** (`nhat-ky.html`) và API `kho-thoc`.

## Cấu trúc thư mục

```
tests/                      # Root test
  common.sh                 # Hàm dùng chung (curl, assert, tổng kết)
  domain/nhatky/            # Test màn Nhật Ký
    cachlygia.sh              # Cách ly gia đình — chạy function + API + tích hợp
    cachlygia/
      cachlygia-function.sh   # NK-ISO-F* — test function (node --test)
      cachlygia-function.test.mjs
      cachlygia-api.sh        # NK-ISO-A* — test API
      cachlygia-integration.sh
    dangkybe.sh               # Đăng ký bé — giới hạn 3 bé / gia đình
    doiqua.sh                 # Đổi quà — bắt buộc passcode
    familysession.sh          # Phiên gia đình — unlock_family
    nhatky.sh                 # Chạy tất cả test nhật ký
  test-case.md                # Bảng ID test chi tiết
```

## Yêu cầu

- `bash`, `curl`, `node` (để parse JSON)
- API đang chạy (mặc định production hoặc local)

## Chạy nhanh

Từ thư mục gốc repo:

```bash
# Toàn bộ test Nhật Ký (đổi quà trước, đăng ký bé sau — tránh xóa hết profile giữa chừng)
bash tests/domain/nhatky/nhatky.sh

# Chỉ test đăng ký bé (giới hạn 3)
bash tests/domain/nhatky/dangkybe.sh

# Chỉ test đổi quà
bash tests/domain/nhatky/doiqua.sh
# Chỉ test cách ly gia đình
bash tests/domain/nhatky/cachlygia.sh
```

## Chạy với API local

```bash
API_URL='http://localhost:3001/kho-thoc/' bash tests/domain/nhatky/nhatky.sh
```

Hoặc export trước:

```bash
export API_URL='http://localhost:3001/kho-thoc/'
bash tests/domain/nhatky/dangkybe.sh
```

## Chạy với API production (mặc định)

Không cần đặt biến — mặc định:

```
https://apinhatkyvumua.taho.cat/kho-thoc/
```

```bash
bash tests/domain/nhatky/nhatky.sh
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

## ID test — phiên gia đình (`familysession.sh` — Phase 3.1)

Spec: [family-session.md](../brd/family-session.md). Script chưa có cho đến khi triển khai code.

| ID | Mô tả | Kỳ vọng |
|----|--------|---------|
| NK-SES-01 | Chưa unlock, không có `X-Family-Id` hợp lệ | Profiles trống hoặc guard client |
| NK-SES-02 | `unlock_family` đúng mã | HTTP 200, có `familyId` |
| NK-SES-03 | `unlock_family` sai mã | HTTP 403 |
| NK-SES-04 | Sau unlock, GET profiles | Chỉ bé cùng `family_id` |
| NK-SES-05 | `type=log` sau unlock | Không cần passcode body |
| NK-SES-06 | `type=redeem` sau unlock | Vẫn bắt buộc passcode body |
| NK-SES-07 | Bootstrap đăng ký bé đầu | Response có `familyId` |
| NK-SES-08 | Xóa localStorage session | Thao tác lại yêu cầu unlock |

## Đọc kết quả

Mỗi script in:

- `PASS` — đạt
- `FAIL` — không đạt
- `SKIP` — bỏ qua (thiếu dữ liệu / điều kiện)

Dòng cuối: `Kết quả: THÀNH CÔNG` hoặc `THẤT BẠI`.

Exit code: `0` = pass, `1` = có lỗi.
