# Spec — Session gia đình bằng passcode (Phase 3.1)

**Phiên bản:** 1.0  
**Ngày:** 14/06/2026  
**Trạng thái:** Đã triển khai (14/06/2026)  
**Liên quan:** [passcode.md](./passcode.md) · [nhatky.md](./nhatky.md) · [usecase-actor.md](./usecase-actor.md)

---

## 1. Vấn đề

Sau khi bật **cách ly gia đình** (`family_id` + header `X-Family-Id`), mỗi trình duyệt tự sinh một `family_id` ngẫu nhiên khi chưa có cache. Hệ quả:

| Tình huống | Hành vi hiện tại (lỗi) |
|------------|-------------------------|
| Ba/mẹ mở Nhật Ký trên trình duyệt/thiết bị mới | `family_id` mới → danh sách bé **trống** dù gia đình đã có bé trên server |
| Xóa cache / đổi trình duyệt | Mất `family_id` cũ → không thấy bé của nhà mình |
| Gia đình khác | Không lẫn dữ liệu (đúng) — nhưng gia đình mình cũng không truy cập được |

Trang Nhật Ký **không có đăng nhập**; passcode trước đây chỉ dùng khi **đổi quà**. Cần mở rộng passcode làm **chìa khóa phiên gia đình** mà vẫn giữ UX đơn giản cho bé và ba/mẹ.

---

## 2. Mục tiêu thiết kế

1. **Lần nhập passcode đầu** — xác định đúng `family_id`, hiển thị đúng các bé của gia đình.
2. **Lưu phiên trên trình duyệt** — sau khi nhập đúng, dùng bình thường không hỏi lại passcode cho các thao tác hàng ngày.
3. **Đổi quà** — **bắt buộc nhập passcode lần nữa** mỗi lần đổi (xác nhận có chủ ý, mã đúng bé).
4. **Ghi nhiệm vụ** — sau khi đã mở phiên, **không** nhập passcode thêm.
5. **Mất cache / trình duyệt mới** — quay lại bước (1): nhập passcode lần đầu.

**Không** thêm màn hình đăng nhập tài khoản. **Không** lưu plain text passcode trên client — chỉ lưu `family_id` đã xác thực.

---

## 3. Hai tầng passcode

| Tầng | Tên | Mục đích | Khi nào | Lưu localStorage |
|------|-----|----------|---------|------------------|
| **1** | Mở phiên gia đình | Resolve `family_id`, load đúng bé | Mọi thao tác khi chưa có phiên | `kho_thoc_family_id` + cờ phiên |
| **2** | Xác nhận đổi quà | Validate mã của **đúng bé** đang đổi | Mỗi lần nhấn "Nhận Quà" | **Không** — nhập mới mỗi lần |

Cùng một mã số (mã đổi quà của bé, lưu bcrypt trên server). Khác **ngữ cảnh** và **có lưu phiên hay không**.

```
┌─────────────────────────────────────────────────────────────┐
│  Tầng 1 — Mở phiên (1 lần / trình duyệt / đến khi xóa cache) │
│  Nhập mã bất kỳ bé nào trong gia đình → server trả family_id │
│  → lưu family_id → hiển thị tất cả bé cùng gia đình          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Thao tác hàng ngày (không hỏi passcode thêm)                │
│  • Chọn bé • Tick nhiệm vụ • Ghi nhật ký • Xóa log • Xóa bé  │
└─────────────────────────────────────────────────────────────┘
                              │
              Đổi quà ────────┼───────────────────────────────┐
                              ▼                               ▼
┌─────────────────────────────────────┐   ┌──────────────────────────────┐
│  Tầng 2 — Đổi quà (mỗi lần)         │   │  Ghi nhiệm vụ — KHÔNG hỏi    │
│  Modal passcode + profileId bé đó   │   │  passcode lần 2              │
└─────────────────────────────────────┘   └──────────────────────────────┘
```

---

## 4. Luồng người dùng

### 4.1 Ba/mẹ quay lại (đã có bé trên server)

```
Mở nhat-ky.html
→ Chưa có phiên: danh sách bé trống (hoặc placeholder)
→ Chạm bất kỳ: chọn bé / ghi nhật ký / đổi quà / đăng ký thêm / xóa...
→ Modal "Nhập mã gia đình" (passcode bất kỳ bé trong nhà)
→ POST unlock_family → đúng → lưu family_id → tải lại profiles
→ Dùng bình thường
```

### 4.2 Gia đình mới (chưa có bé) — bootstrap

```
Mở nhat-ky.html → chưa có phiên
→ Màn hình chào: "Đăng ký bé đầu tiên" (KHÔNG cần passcode trước)
→ POST type=profile → server tạo family_id mới + passcode bé đầu
→ Response: familyId + passcode → client lưu family_id + đánh dấu phiên mở
→ Modal hiện passcode cho ba/mẹ ghi nhớ
```

**Ngoại lệ duy nhất** không cần passcode trước: **đăng ký bé đầu tiên** của gia đình mới.

### 4.3 Đổi quà (sau khi đã mở phiên)

```
Chọn bé → chọn quà → "Nhận Quà"
→ Modal passcode (tầng 2) — luôn hiện, không dùng cache
→ POST type=redeem + passcode + profileId
→ Thành công → cập nhật UI
```

### 4.4 Ghi nhiệm vụ

```
Đã mở phiên → tick nhiệm vụ → "Ghi Nhật Ký"
→ POST type=log (chỉ header X-Family-Id, không passcode)
```

### 4.5 Mất phiên

| Sự kiện | Hành vi |
|---------|---------|
| Xóa site data / localStorage | Mất `family_id` → cần passcode tầng 1 lại |
| Trình duyệt / thiết bị khác | Như trên |
| Passcode bé bị admin thu hồi | Lần đổi quà hoặc mở phiên tiếp theo sẽ lỗi — dùng mã bé khác hoặc liên hệ admin |

---

## 5. Client — localStorage

| Key | Giá trị | Ghi chú |
|-----|---------|---------|
| `kho_thoc_family_id` | `fam_...` từ server sau unlock hoặc đăng ký bé đầu | **Không** tự sinh UUID ngẫu nhiên nữa |
| `kho_thoc_family_unlocked` | `"1"` | Có phiên hợp lệ trên trình duyệt này |

**Không lưu:** plain text passcode, JWT người dùng gia đình.

### Hàm client (đề xuất — `family-api.js`)

| Hàm | Vai trò |
|-----|---------|
| `isFamilyUnlocked()` | `localStorage` có `family_id` + cờ unlocked |
| `setFamilySession(familyId)` | Lưu sau unlock / đăng ký bé đầu |
| `clearFamilySession()` | Xóa phiên (debug / đăng xuất thủ công) |
| `requireFamilySession(action)` | Nếu chưa unlock → modal tầng 1 → rồi chạy `action` |
| `getFamilyId()` | Trả `family_id` đã lưu; **không** sinh ngẫu nhiên khi chưa unlock |

### Guard thao tác trên `nhat-ky.html`

| Thao tác | Cần tầng 1 | Cần tầng 2 |
|----------|:----------:|:----------:|
| Tải / xem danh sách bé | ✅ | — |
| Chọn bé | ✅ | — |
| Ghi nhật ký (nhiệm vụ) | ✅ | ❌ |
| Xóa nhật ký | ✅ | ❌ |
| Xóa bé | ✅ | ❌ |
| Đăng ký bé thêm (đã có phiên) | ✅ | — |
| Đăng ký bé **đầu tiên** (bootstrap) | ❌ | — |
| Đổi quà | ✅ | ✅ mỗi lần |

---

## 6. API

### 6.1 Mở phiên gia đình (mới)

```http
POST /kho-thoc/
Content-Type: application/json

{ "type": "unlock_family", "passcode": "4829" }
```

**Server:**

1. Duyệt các `redeem_passcodes` active (`revoked_at IS NULL`).
2. `bcrypt.compare` với `passcode` — tìm `profile_id` khớp.
3. Lấy `profiles.family_id` của profile đó.
4. Cập nhật `last_used_at` trên dòng passcode khớp.
5. Rate limit: 5 lần sai / 15 phút / IP (hoặc fingerprint header).

**Response thành công `200`:**

```json
{
  "result": "success",
  "familyId": "fam_v1_default",
  "matchedProfileId": "p_1718000000000",
  "matchedProfileName": "Minh"
}
```

**Lỗi:**

| HTTP | Trường hợp |
|------|------------|
| `403` | Mã sai hoặc không có mã active |
| `429` | Quá số lần thử |

**Lưu ý:** Không cần `X-Family-Id` khi gọi `unlock_family`.

### 6.2 Các API hiện có (sau khi mở phiên)

Mọi request khác gửi `X-Family-Id: <familyId>` từ phiên đã lưu — giữ nguyên contract Phase 3.

| type | Passcode body | Ghi chú |
|------|---------------|---------|
| `profile` (insert đầu tiên, bootstrap) | Không | Server trả `familyId` + `passcode` |
| `profile` (thêm bé khi đã có phiên) | Không | Filter theo `X-Family-Id` |
| `log` | Không | Chỉ cần phiên tầng 1 |
| `delete_log` | Không | Chỉ cần phiên tầng 1 |
| `redeem` | **Bắt buộc** mỗi lần | Tầng 2 — không thay đổi Phase 2 |

### 6.3 Đăng ký bé đầu tiên (bootstrap) — bổ sung response

```json
{
  "result": "success",
  "action": "inserted",
  "passcode": "4829",
  "familyId": "fam_a1b2c3d4-..."
}
```

Client: `setFamilySession(familyId)` ngay sau response.

---

## 7. Bảo mật

| Mục | Cách xử lý |
|-----|------------|
| Plain passcode trên client | **Không** lưu — chỉ `family_id` |
| Brute force tầng 1 | Rate limit IP / 15 phút |
| Brute force tầng 2 (redeem) | Giữ rate limit theo `profileId` (Phase 2) |
| HTTPS | Bắt buộc |
| Mã theo bé | Tầng 2 validate `profile_id`; tầng 1 chấp nhận mã **bất kỳ bé** cùng `family_id` |
| Ai biết passcode | Coi như thành viên gia đình — mức bảo vệ phù hợp app gia đình |

**Giới hạn chấp nhận:** Ai có passcode + URL vẫn có quyền tương đương ba/mẹ trên trang Nhật Ký (giống thiết kế gốc). Cách ly chính là **giữa các gia đình**, không phải phân quyền bố/mẹ vs bé.

---

## 8. Migration & tương thích

### 8.1 Bé legacy (`fam_v1_default`)

Trình duyệt đã cache profile cũ → `migrateLegacyFamilyIfNeeded()` vẫn gán `fam_v1_default`. Coi như **đã mở phiên** nếu có cache profile legacy.

### 8.2 Gia đình đã đăng ký trên `family_id` ngẫu nhiên

Trước Phase 3.1, client tự sinh `fam_<uuid>`. Bé gắn với UUID đó trên server. **Cách vào lại:** nhập passcode bất kỳ bé trong gia đình → `unlock_family` trả đúng `family_id` gốc → ghi đè localStorage.

### 8.3 Database

**Không cần migration SQL mới** — tái dùng `redeem_passcodes` + `profiles.family_id`.

---

## 9. Frontend UI

### Modal tầng 1 — "Mã gia đình"

- Tiêu đề: *Nhập mã xác nhận của một bé trong nhà*
- Gợi ý: *Dùng mã ba/mẹ đã nhận khi đăng ký bé. Quên mã → liên hệ admin.*
- Input 4–6 số, nút Xác nhận / Hủy
- Link phụ: *Gia đình mới? Đăng ký bé đầu tiên*

### Modal tầng 2 — Đổi quà

- Giữ modal hiện tại (Phase 2) — nhập mã của **bé đang đổi**
- Không pre-fill từ phiên tầng 1

### Trạng thái chưa mở phiên

- Không hiển thị bé của gia đình khác (danh sách trống)
- Banner nhẹ: *Nhập mã gia đình để xem bé của bạn*

---

## 10. Kiểm thử (ID dự kiến)

| ID | Mô tả | Kỳ vọng |
|----|--------|---------|
| NK-SES-01 | Chưa unlock, GET profiles | Trống hoặc không gọi API cho đến khi unlock |
| NK-SES-02 | `unlock_family` đúng mã | Trả `familyId`, client lưu localStorage |
| NK-SES-03 | `unlock_family` sai mã | HTTP 403 |
| NK-SES-04 | Sau unlock, GET profiles | Chỉ bé cùng `family_id` |
| NK-SES-05 | `type=log` sau unlock | Không cần passcode body |
| NK-SES-06 | `type=redeem` sau unlock | Vẫn bắt buộc passcode body |
| NK-SES-07 | Bootstrap đăng ký bé đầu | Không cần unlock trước; response có `familyId` |
| NK-SES-08 | Xóa `kho_thoc_family_*` | Thao tác lại yêu cầu tầng 1 |

Chi tiết runner: `docs/tests/test-case.md` · script `docs/tests/domain/nhatky/familysession/` (khi triển khai).

---

## 11. Lộ trình triển khai

| Bước | Thành phần |
|------|------------|
| 1 | API `unlock_family` + rate limit |
| 2 | `family-api.js`: bỏ auto UUID, thêm session helpers |
| 3 | `nhat-ky.js`: guard `requireFamilySession`, modal tầng 1 |
| 4 | Bootstrap đăng ký bé đầu + response `familyId` |
| 5 | Test `familysession-*.sh` + cập nhật `nhatky.sh` |
| 6 | Deploy VPS + push GitHub Pages |

---

## 12. Tham chiếu

- [passcode.md](./passcode.md) — mã đổi quà, bcrypt, redeem
- [nhatky.md](./nhatky.md) — cách ly gia đình, giới hạn 3 bé
- [admin.md](./admin.md) — sinh lại mã khi quên
- [usecase-actor.md](./usecase-actor.md) — actor & luồng tổng quan
