# Spec — Passcode đổi quà (Phase 2 Auth)

**Phiên bản:** 1.2  
**Ngày:** 10/06/2026  
**Trạng thái:** Đã thống nhất — đang triển khai

---

## 1. Mục tiêu

Bảo vệ **đổi quà** (trừ Hạt Gạo) bằng mã xác nhận **riêng cho từng bé**. Khi đăng ký bé mới, server trả mã ngay cho bố/mẹ — giữ lại cho các lần đổi quà sau. Chỉ khi **quên mã** mới liên hệ admin.

**Không** thay đổi luồng nhật ký hàng ngày: bé vẫn vào `nhat-ky.html`, tick nhiệm vụ và ghi nhật ký như hiện tại — không cần đăng nhập hay passcode.

---

## 2. Hai loại credential

| Loại | Ai dùng | Mục đích | Lưu trữ |
|------|---------|----------|---------|
| **Tài khoản admin** | Bố/mẹ / vận hành | Đăng nhập trang `/admin` để quản lý mã đổi quà theo từng bé | DB: `admin_users.password_hash` (bcrypt) |
| **Mã đổi quà** | Bố/mẹ đọc cho bé | Xác nhận khi bé nhấn "Nhận Quà" trên nhật ký | DB: `redeem_passcodes` (bcrypt, gắn `profile_id`); plain text trả **một lần** khi đăng ký bé mới hoặc admin sinh mã mới |

Hai loại **không trùng nhau**. Mỗi bé có **một mã active** riêng.

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

### 3.4 Admin — quản lý mã theo bé

```
Admin → /admin/login → username + password → JWT
→ /admin/dashboard (layout sidebar + nội dung chính)
→ Danh sách bé + trạng thái mã → Sinh mã mới / Thu hồi từng bé
→ Copy mã plain text → gửi Zalo cho bố/mẹ (khi quên mã)
```

- **Sinh mã mới** theo từng bé: tự động thu hồi mã active cũ của bé đó.
- Plain text mã trả khi đăng ký bé (`profile`) hoặc admin `generate` — không lưu DB, không hiện lại sau đó.

---

## 4. URL

### Frontend (GitHub Pages)

| URL | Trang |
|-----|-------|
| `.../nhat-ky.html` | Nhật ký (+ modal passcode đổi quà) |
| `.../admin/` | Redirect login hoặc dashboard |
| `.../admin/login.html` | Đăng nhập admin |
| `.../admin/dashboard.html` | Quản trị — mã đổi quà (sidebar + main) |

Không link công khai tới `/admin` từ nav trang bé.

### API (VPS)

Base: `https://apinhatkyvumua.taho.cat/kho-thoc/`

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/admin/login` | Không |
| `GET` | `/admin/passcode` | JWT admin |
| `POST` | `/admin/passcode/generate` | JWT admin |
| `POST` | `/admin/passcode/revoke` | JWT admin |
| `POST` | `/` `{ type: "redeem", ... }` | Passcode đổi quà (theo profileId) |
| `GET/POST` | `/` *(còn lại)* | Không *(Phase 2)* |

---

## 5. Database

Migration: `kho-thoc-api/migrations/002_redeem_auth.sql`

```sql
admin_users       — id, username, password_hash, created_at
redeem_passcodes  — id, profile_id, passcode_hash, created_at, revoked_at, created_by, last_used_at
```

- Mỗi bé **một** mã active: `profile_id = $id AND revoked_at IS NULL`.
- `profile_id` tham chiếu `profiles(id)` — xóa bé thì xóa luôn mã.
- Khi `INSERT profiles` (bé mới): server gọi `createInitialPasscodeForProfile` (hash only).
- Seed admin: `npm run seed:admin -- --username ... --password ...`

---

## 6. API chi tiết

### 6.1 Admin login

```http
POST /kho-thoc/admin/login
Content-Type: application/json

{ "username": "admin", "password": "..." }
```

Response `200`:

```json
{ "token": "<JWT>", "expiresIn": 604800 }
```

JWT payload: `{ "sub": "admin:1", "role": "admin", "exp": ... }`

### 6.2 Danh sách bé + trạng thái mã

```http
GET /kho-thoc/admin/passcode
Authorization: Bearer <JWT>
```

Response `200`:

```json
{
  "result": "success",
  "profiles": [
    {
      "profileId": "p_...",
      "profileName": "Minh",
      "avatar": "👶",
      "hasActivePasscode": true,
      "createdAt": "2026-06-10T12:00:00.000Z",
      "lastUsedAt": null
    }
  ]
}
```

### 6.3 Sinh mã đổi quà (theo bé)

```http
POST /kho-thoc/admin/passcode/generate
Authorization: Bearer <JWT>
Content-Type: application/json

{ "profileId": "p_...", "length": 4 }
```

Response `200`:

```json
{
  "result": "success",
  "profileId": "p_...",
  "profileName": "Minh",
  "passcode": "4829",
  "createdAt": "2026-06-10T12:00:00.000Z",
  "message": "Copy mã và gửi bố/mẹ qua Zalo cho bé Minh. Mã cũ của bé này đã bị thu hồi."
}
```

### 6.4 Thu hồi mã (theo bé)

```http
POST /kho-thoc/admin/passcode/revoke
Authorization: Bearer <JWT>
Content-Type: application/json

{ "profileId": "p_..." }
```

### 6.5 Đổi quà

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

### 6.6 Đăng ký bé mới (tự tạo passcode)

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
| Plain text passcode | Trả khi đăng ký bé (`profile`) hoặc admin `generate`; DB chỉ hash |
| Brute force mã 4 số | Rate limit: 5 lần sai / 15 phút / profileId |
| Admin JWT | Hết hạn 7 ngày; `localStorage` key `kho_thoc_admin_token` |
| `JWT_SECRET` | Env trên VPS — không commit |
| HTTPS | Bắt buộc (đã có) |
| Mã theo bé | Validate `profile_id` khi redeem — mã bé A không dùng cho bé B |

---

## 8. Frontend

### 8.1 `nhat-ky.html`

- Modal passcode thay `confirm()` khi đổi quà.
- `redeemReward()`: chờ API success mới cập nhật balance/history.
- Đăng ký bé mới: modal hiện passcode ngay — bố/mẹ ghi nhớ; quên mã thì liên hệ admin.

### 8.2 Admin — layout sidebar + main

Sau đăng nhập → `dashboard.html`:

| Vùng | Nội dung |
|------|----------|
| **Sidebar trái** | Logo, menu (Mã đổi quà, …), Đăng xuất — mở rộng sau |
| **Main phải** | Bảng danh sách bé, trạng thái mã, Sinh mã mới / Thu hồi |

Files:

- `assets/js/shared/admin-auth.js` — JWT, `adminFetch()`
- `assets/js/pages/admin-login.js`
- `assets/js/pages/admin-dashboard.js`
- `assets/css/pages/admin.css`

---

## 9. Triển khai

```bash
# VPS / local
cd kho-thoc-api
npm install
npm run migrate
npm run seed:admin -- --username admin --password '...'
# Thêm JWT_SECRET vào .env
docker compose up -d --build   # hoặc npm run dev
```

Frontend: push GitHub Pages sau khi API đã deploy.

**Lưu ý migration:** Nếu đã chạy `002` phiên bản cũ (mã global, không có `profile_id`), cần migrate thủ công hoặc reset bảng `redeem_passcodes`.

---

## 10. Phase 3 (multi-tenant)

- Thêm `family_id` vào `admin_users`, `profiles`, `redeem_passcodes`, JWT.
- Mỗi gia đình quản lý bé và mã riêng.
- Không phá contract API Phase 2.

---

## 11. Tham chiếu

- Kế hoạch tổng: [kehoach.md](../kehoach.md)
- Nghiệp vụ: [TAI-LIEU-NGHIEP-VU.md](../TAI-LIEU-NGHIEP-VU.md)
