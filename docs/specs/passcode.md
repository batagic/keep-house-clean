# Spec — Passcode đổi quà (Phase 2)

**Phiên bản:** 1.3  
**Ngày:** 10/06/2026  
**Trạng thái:** Đang triển khai  
**Liên quan:** [admin.md](./admin.md) · [brd.md](./brd.md)

---

## 1. Mục tiêu

Bảo vệ **đổi quà** bằng mã xác nhận **riêng cho từng bé**. Đăng ký bé mới → server trả mã plain text cho bố/mẹ. Quên mã → admin sinh lại ([admin.md](./admin.md)).

**Không** đổi luồng nhật ký hàng ngày — không cần passcode khi ghi nhật ký.

---

## 2. Mã đổi quà

| | |
|--|--|
| Ai dùng | Bố/mẹ đọc cho bé khi đổi quà |
| Lưu trữ | `redeem_passcodes` (bcrypt, gắn `profile_id`) |
| Plain text | Trả **một lần** khi đăng ký bé hoặc admin sinh mã |

Mỗi bé **một mã active** (`revoked_at IS NULL`).

---

## 3. Luồng nghiệp vụ

### 3.1 Nhật ký hàng ngày — không đổi

```
Bé → nhat-ky.html → tick nhiệm vụ → Ghi Nhật Ký → POST type=log → cộng Gạo + EXP
```

Không passcode. Các thao tác sau vẫn mở (Phase 2):

- Đăng ký bé mới (`POST type=profile`) — **kèm tự tạo passcode**, trả plain text cho bố/mẹ
- Xóa nhật ký (`POST type=delete_log`)
- Đọc profiles / logs (`GET`)

### 3.2 Đăng ký bé mới — tự tạo passcode

```
Bố/mẹ → Đăng ký bé mới → POST type=profile
→ Server INSERT profiles + tạo redeem_passcodes (hash)
→ Response trả passcode plain text → modal hiện mã cho bố/mẹ ghi nhớ
→ Bố/mẹ giữ mã, dùng cho các lần đổi quà sau
```

- Plain text **trả ngay** trong response `inserted` — hiện modal trên `nhat-ky.html`.
- Nếu quên mã: bố/mẹ liên hệ admin → admin **Sinh mã mới** → gửi lại qua Zalo.

### 3.3 Đổi quà — cần mã của đúng bé

```
Bé chọn quà → Nhấn "Nhận Quà" → Modal nhập mã
→ Bé hỏi bố/mẹ → Bố/mẹ đọc mã (đã nhận khi đăng ký bé)
→ POST type=redeem + passcode + profileId
→ Server validate bcrypt theo profileId → ghi log REDEEM, trừ Gạo
```

- Mã sai hoặc không khớp bé → `403`, **không** trừ Gạo, **không** cập nhật UI.
- Chỉ cập nhật UI sau khi API trả `success`.

Quên mã → bố/mẹ liên hệ admin → xem [admin.md](./admin.md).

---

## 4. URL & API

| URL | Trang |
|-----|-------|
| `.../nhat-ky.html` | Nhật ký + modal passcode đổi quà |

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/` `{ type: "redeem", ... }` | Passcode (theo profileId) |
| `POST` | `/` `{ type: "profile", ... }` | Không — trả passcode khi inserted |
| `GET/POST` | `/` *(log, delete_log, …)* | Không |

---

## 5. Database

Migration: `kho-thoc-api/migrations/002_redeem_auth.sql`

```sql
redeem_passcodes — id, profile_id, passcode_hash, created_at, revoked_at, created_by, last_used_at
```

- Mỗi bé một mã active; `profile_id` → `profiles(id)`.
- Đăng ký bé mới: `createInitialPasscodeForProfile` → hash DB, plain text trong response.

---

## 6. API chi tiết

### 6.1 Đổi quà

```http
POST /kho-thoc/
Content-Type: application/json

{
  "type": "redeem",
  "passcode": "4829",
  "profileId": "p_...",
  "profileName": "Minh",
  "rewardIds": ["r7", "r13"]
}
```

Server:

1. Validate passcode (bcrypt, mã active **của đúng profileId**).
2. Tính `totalCost` từ catalog quà server-side (không tin client).
3. Kiểm tra số dư Gạo.
4. Ghi log `tasks=REDEEM`, trừ Gạo.
5. Cập nhật `last_used_at`.

Response lỗi:

| HTTP | Trường hợp |
|------|------------|
| `403` | Mã sai / bé chưa có mã active |
| `400` | Thiếu field, không đủ Gạo, rewardIds không hợp lệ |
| `429` | Thử sai quá 5 lần / 15 phút / profileId |

**Chặn bypass:** `POST type=log` với `tasks=REDEEM` bị từ chối — bắt buộc qua `type=redeem`.

### 6.2 Đăng ký bé mới (tự tạo passcode)

```http
POST /kho-thoc/
Content-Type: application/json

{ "type": "profile", "id": "p_...", "name": "Minh", "avatar": "👶", ... }
```

Server khi `action: inserted`:

1. INSERT `profiles`.
2. `createInitialPasscodeForProfile(profileId)` — lưu hash, trả plain text **một lần**.

Response `200`:

```json
{
  "result": "success",
  "action": "inserted",
  "passcode": "4829"
}
```

---

## 7. Bảo mật

| Mục | Cách xử lý |
|-----|------------|
| Plain text passcode | Trả khi đăng ký bé hoặc admin generate; DB chỉ hash |
| Brute force mã 4 số | Rate limit: 5 lần sai / 15 phút / profileId |
| HTTPS | Bắt buộc |
| Mã theo bé | Validate `profile_id` — mã bé A không dùng cho bé B |

---

## 8. Frontend

### 8.1 `nhat-ky.html`

- Modal passcode thay `confirm()` khi đổi quà.
- `redeemReward()`: chờ API success mới cập nhật balance/history.
- Đăng ký bé mới: modal hiện passcode ngay — bố/mẹ ghi nhớ; quên mã thì liên hệ admin.

Trang admin → [admin.md](./admin.md).

---

## 9. Triển khai

Xem [operations.md](../operations.md). Migration `002_redeem_auth.sql`. Nếu đã chạy `002` cũ (mã global), reset hoặc migrate thủ công `redeem_passcodes`.

---

## 10. Phase 3 (multi-tenant)

- Thêm `family_id` vào `admin_users`, `profiles`, `redeem_passcodes`, JWT.
- Mỗi gia đình quản lý bé và mã riêng.
- Không phá contract API Phase 2.

---

## 11. Tham chiếu

- [admin.md](./admin.md) — trang quản trị mã
- [brd.md](./brd.md) — nghiệp vụ tổng thể
- [operations.md](../operations.md) — deploy

