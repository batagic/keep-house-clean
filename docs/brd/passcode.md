# Spec — Passcode (đổi quà + phiên gia đình)

**Phiên bản:** 2.0  
**Ngày:** 14/06/2026  
**Trạng thái:** Đang triển khai (redeem ✅ · session gia đình 📋 thiết kế)  
**Liên quan:** [family-session.md](./family-session.md) · [admin.md](./admin.md) · [brd.md](./brd.md)

---

## 1. Mục tiêu

Mã xác nhận **riêng cho từng bé** phục vụ hai vai trò:

| Vai trò | Mô tả | Doc |
|---------|--------|-----|
| **Tầng 1 — Phiên gia đình** | Nhập một lần / trình duyệt → resolve `family_id`, hiển thị đúng bé | [family-session.md](./family-session.md) |
| **Tầng 2 — Đổi quà** | Nhập lại **mỗi lần** đổi quà của bé đó | §3.3 bên dưới |

Đăng ký bé mới → server trả mã plain text cho bố/mẹ. Quên mã → admin sinh lại ([admin.md](./admin.md)).

---

## 2. Mã đổi quà

| | |
|--|--|
| Ai dùng | Bố/mẹ — mở phiên gia đình **hoặc** xác nhận đổi quà |
| Lưu trữ | `redeem_passcodes` (bcrypt, gắn `profile_id`) |
| Plain text | Trả **một lần** khi đăng ký bé hoặc admin sinh mã |
| Trên client | **Không** lưu plain text — chỉ lưu `family_id` sau tầng 1 |

Mỗi bé **một mã active** (`revoked_at IS NULL`).

---

## 3. Luồng nghiệp vụ

### 3.1 Mở phiên gia đình (tầng 1) — mới Phase 3.1

```
Ba/mẹ → nhat-ky.html → chưa có phiên
→ Thao tác bất kỳ → Modal nhập mã (mã bất kỳ bé trong nhà)
→ POST type=unlock_family
→ Server trả familyId → lưu localStorage → load đúng bé
```

- **Ghi nhiệm vụ sau khi mở phiên:** không hỏi passcode thêm.
- **Mất cache / trình duyệt mới:** nhập lại tầng 1.
- Chi tiết: [family-session.md](./family-session.md).

### 3.2 Đăng ký bé mới

**Gia đình mới (bootstrap):** không cần passcode trước — đăng ký bé đầu tiên → server tạo `family_id` + passcode.

```
Bố/mẹ → Đăng ký bé mới → POST type=profile
→ Server INSERT profiles + redeem_passcodes (hash)
→ Response: passcode + familyId (bootstrap) → modal hiện mã
```

**Gia đình đã mở phiên:** đăng ký thêm bé (tối đa 3/gia đình) — không cần passcode, dùng `X-Family-Id` từ phiên.

### 3.3 Đổi quà (tầng 2) — mỗi lần

```
Bé chọn quà → "Nhận Quà" → Modal nhập mã (luôn hiện, không dùng cache)
→ POST type=redeem + passcode + profileId
→ Server validate bcrypt theo profileId → ghi log REDEEM, trừ Gạo
```

- Mã sai → `403`, không trừ Gạo.
- **Khác tầng 1:** luôn nhập lại, kể cả đã mở phiên.

### 3.4 Ghi nhật ký hàng ngày

```
Đã mở phiên → tick nhiệm vụ → Ghi Nhật Ký → POST type=log
```

Chỉ cần header `X-Family-Id` — **không** passcode trong body.

---

## 4. URL & API

| URL | Trang |
|-----|-------|
| `.../nhat-ky.html` | Modal tầng 1 (phiên) + tầng 2 (đổi quà) |

| Method | Path | Auth |
|--------|------|------|
| `POST` | `{ type: "unlock_family", passcode }` | Không header family — trả `familyId` |
| `POST` | `{ type: "redeem", ... }` | Passcode tầng 2 + `X-Family-Id` |
| `POST` | `{ type: "profile", ... }` | Bootstrap hoặc `X-Family-Id` |
| `GET/POST` | `log`, `delete_log`, … | `X-Family-Id` (phiên tầng 1) |

---

## 5. Database

Migrations: `002_redeem_auth.sql`, `003_profile_passcodes.sql`, `004_family_id.sql`

```sql
redeem_passcodes — id, profile_id, passcode_hash, created_at, revoked_at, created_by, last_used_at
profiles         — ..., family_id
```

Không cần bảng mới cho session — tái dùng passcode hiện có.

---

## 6. API chi tiết

### 6.1 Mở phiên gia đình

```http
POST /kho-thoc/
{ "type": "unlock_family", "passcode": "4829" }
```

→ `200 { "result": "success", "familyId": "...", "matchedProfileId": "...", "matchedProfileName": "..." }`

### 6.2 Đổi quà

```http
POST /kho-thoc/
Content-Type: application/json
X-Family-Id: fam_...

{
  "type": "redeem",
  "passcode": "4829",
  "profileId": "p_...",
  "profileName": "Minh",
  "rewardIds": ["r7", "r13"]
}
```

| HTTP | Trường hợp |
|------|------------|
| `403` | Mã sai / bé chưa có mã active |
| `400` | Thiếu field, không đủ Gạo |
| `429` | Thử sai quá 5 lần / 15 phút / profileId |

**Chặn bypass:** `POST type=log` với `tasks=REDEEM` bị từ chối.

### 6.3 Đăng ký bé mới

Response khi `action: inserted`:

```json
{
  "result": "success",
  "action": "inserted",
  "passcode": "4829",
  "familyId": "fam_..."
}
```

---

## 7. Bảo mật

| Mục | Cách xử lý |
|-----|------------|
| Plain text passcode | Chỉ trả khi đăng ký/admin generate; DB chỉ hash |
| Lưu client | `family_id` + cờ phiên — **không** lưu mã |
| Brute force tầng 1 | Rate limit theo IP |
| Brute force tầng 2 | 5 lần sai / 15 phút / profileId |
| HTTPS | Bắt buộc |
| Mã theo bé | Tầng 2: validate `profile_id`; tầng 1: mã bất kỳ bé cùng gia đình |

---

## 8. Frontend

### `nhat-ky.html` / `family-api.js`

- Modal **tầng 1** khi `!isFamilyUnlocked()` và user thao tác.
- Modal **tầng 2** khi đổi quà — luôn nhập mới.
- `getFamilyId()` không tự sinh UUID khi chưa unlock.
- Đăng ký bé đầu: CTA bootstrap không qua modal tầng 1.

Trang admin → [admin.md](./admin.md).

---

## 9. Triển khai

Xem [operator.md](../technical/operator.md). Session gia đình: triển khai theo [family-session.md §11](./family-session.md#11-lộ-trình-triển-khai).

---

## 10. Tham chiếu

- [family-session.md](./family-session.md) — thiết kế phiên gia đình (canonical)
- [nhatky.md](./nhatky.md) — cách ly `family_id`
- [admin.md](./admin.md) — quản trị mã
- [brd.md](./brd.md) — nghiệp vụ tổng thể
