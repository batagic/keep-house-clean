# Test case — Nhật Ký Vụ Mùa

**Cập nhật:** 14/06/2026

## Cách ly gia đình (`tests/domain/nhatky/cachlygia/`)

Chạy:

```bash
bash tests/domain/nhatky/cachlygia.sh
# hoặc từng lớp:
bash tests/domain/nhatky/cachlygia/cachlygia-function.sh
bash tests/domain/nhatky/cachlygia/cachlygia-api.sh
bash tests/domain/nhatky/cachlygia/cachlygia-integration.sh
```

### Lớp FUNCTION (`cachlygia-function.sh` + `cachlygia-function.test.mjs`)

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
| NK-ISO-F12 | migration SQL | `code/kho-thoc-api/migrations/004_family_id.sql` có `family_id` |

## Phiên gia đình — Phase 3.1 (`familysession/` — khi triển khai)

Spec: [family-session.md](../brd/family-session.md)

| ID | Mô tả | Kỳ vọng |
|----|--------|---------|
| NK-SES-01 | Chưa unlock | Không load bé / guard client |
| NK-SES-02 | `unlock_family` đúng | Trả `familyId`, lưu localStorage |
| NK-SES-03 | `unlock_family` sai | HTTP 403 |
| NK-SES-04 | GET profiles sau unlock | Chỉ bé cùng gia đình |
| NK-SES-05 | `type=log` sau unlock | Không passcode body |
| NK-SES-06 | `type=redeem` sau unlock | Bắt buộc passcode body |
| NK-SES-07 | Đăng ký bé đầu (bootstrap) | Response `familyId` + `passcode` |
| NK-SES-08 | Xóa session localStorage | Yêu cầu unlock lại |

### Domain runner

```bash
bash tests/domain/nhatky/nhatky.sh
bash tests/coverage.sh
```
