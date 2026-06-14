# Test case — Nhật Ký Vụ Mùa

**Cập nhật:** 14/06/2026

## Cách ly gia đình (`docs/tests/nhatky/cachlygia/`)

Chạy:

```bash
bash docs/tests/nhatky/cachlygia.sh
# hoặc từng lớp:
bash docs/tests/nhatky/cachlygia/function.sh
bash docs/tests/nhatky/cachlygia/api.sh
bash docs/tests/nhatky/cachlygia/integration.sh
```

### Lớp FUNCTION (`function.sh` + `function.test.mjs`)

| ID | Mô tả | Kỳ vọng |
|----|--------|---------|
| NK-ISO-F01 | `getFamilyId` lần đầu | Sinh `fam_*`, lưu localStorage |
| NK-ISO-F02 | `getFamilyId` đã có mã | Trả mã đã lưu |
| NK-ISO-F03 | `migrateLegacyFamilyIfNeeded` | Cache cũ → `fam_v1_default` |
| NK-ISO-F04 | `familyStorageKey` | Key có hậu tố family_id |
| NK-ISO-F05 | `apiFetch` | Header `X-Family-Id` |
| NK-ISO-F06 | `requireFamilyId` thiếu header | HTTP 400 |
| NK-ISO-F07 | `requireFamilyId` hợp lệ | `req.familyId` được gắn |
| NK-ISO-F08 | `normalizeProfile` | Chuẩn hóa số grain/exp |
| NK-ISO-F09 | `nhat-ky.js` | Dùng `apiFetch`, không `fetch` trực tiếp |
| NK-ISO-F10 | `nhat-ky.js` cache | `familyStorageKey` cho profiles/last_pid |
| NK-ISO-F11 | `nhat-ky.html` | Load `family-api.js` |
| NK-ISO-F12 | Migration SQL | File `004_family_id.sql` |

### Lớp API (`api.sh`)

| ID | Mô tả | Kỳ vọng |
|----|--------|---------|
| NK-ISO-A01 | GET profiles thiếu header | HTTP 400 |
| NK-ISO-A02 | Gia đình mới GET profiles | HTTP 200, 0 bé |
| NK-ISO-A03 | Gia đình A tạo bé | HTTP 200, success |
| NK-ISO-A04 | Gia đình B không thấy bé A | Không có id bé A |
| NK-ISO-A05 | Gia đình A thấy bé mình | Có id bé A |
| NK-ISO-A06 | B ghi log bé A | HTTP 404/400 |
| NK-ISO-A07 | B xóa bé A | error hoặc không xóa |
| NK-ISO-A08 | Bé A vẫn tồn tại | A vẫn thấy bé |
| NK-ISO-A09 | POST thiếu header | HTTP 400 |
| NK-ISO-A10 | B đọc logs bé A | 0 log |

### Lớp INTEGRATION (`integration.sh`)

| ID | Mô tả | Kỳ vọng |
|----|--------|---------|
| NK-ISO-I01a | Gia đình mới trước đăng ký | 0 bé |
| NK-ISO-I01b | Đăng ký bé đầu tiên | inserted |
| NK-ISO-I01c | Sau đăng ký | Chỉ 1 bé của mình |
| NK-ISO-I02 | Hai gia đình song song | Mỗi bên 1 bé riêng |
| NK-ISO-I03a–c | Ghi & đọc nhật ký | A thấy, B không thấy |
| NK-ISO-I04 | Giới hạn 3 bé / gia đình | Bé thứ 4 → 400 |
| NK-ISO-I04b | Gia đình khác | Không bị ảnh hưởng giới hạn |

**Tiên quyết API:** migration `004_family_id.sql` đã chạy trên server.
