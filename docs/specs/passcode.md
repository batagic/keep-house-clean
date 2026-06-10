# Spec — Passcode đổi quà (Phase 2 Auth)

**Phiên bản:** 1.0  
**Ngày:** 10/06/2026  
**Trạng thái:** Đã thống nhất — đang triển khai

---

## 1. Mục tiêu

Bảo vệ **đổi quà** (trừ Hạt Gạo) bằng mã xác nhận do admin tạo, gửi riêng cho bố/mẹ qua kênh ngoài (Zalo, v.v.).

**Không** thay đổi luồng nhật ký hàng ngày: bé vẫn vào `nhat-ky.html`, tick nhiệm vụ và ghi nhật ký như hiện tại — không cần đăng nhập hay passcode.

---

## 2. Hai loại credential

| Loại | Ai dùng | Mục đích | Lưu trữ |
|------|---------|----------|---------|
| **Tài khoản admin** | Bố/mẹ / vận hành | Đăng nhập trang `/admin` để sinh và quản lý mã đổi quà | DB: `admin_users.password_hash` (bcrypt) |
| **Mã đổi quà** | Bố/mẹ đọc cho bé | Xác nhận khi bé nhấn "Nhận Quà" trên nhật ký | DB: `redeem_passcodes.passcode_hash` (bcrypt); plain text chỉ hiện **một lần** khi admin tạo |

Hai loại **không trùng nhau**.

---

## 3. Luồng nghiệp vụ

### 3.1 Nhật ký hàng ngày — không đổi

```
Bé → nhat-ky.html → tick nhiệm vụ → Ghi Nhật Ký → POST type=log → cộng Gạo + EXP
```

Không passcode. Các thao tác sau vẫn mở (Phase 2):

- Đăng ký bé mới (`POST type=profile`)
- Xóa nhật ký (`POST type=delete_log`)
- Đọc profiles / logs (`GET`)

### 3.2 Đổi quà — cần mã

```
Bé chọn quà → Nhấn "Nhận Quà" → Modal nhập mã
→ Bé hỏi bố/mẹ → Bố/mẹ đọc mã (đã nhận qua Zalo)
→ POST type=redeem + passcode
→ Server validate bcrypt → ghi log REDEEM, trừ Gạo
```

- Mã sai → `403`, **không** trừ Gạo, **không** cập nhật UI.
- Chỉ cập nhật UI sau khi API trả `success`.

### 3.3 Admin — quản lý mã

```
Admin → /admin/login → username + password → JWT
→ /admin/dashboard → Tạo mã mới / Thu hồi / Xem trạng thái
→ Copy mã plain text → gửi Zalo cho bố/mẹ
```

- Tạo mã mới **tự động thu hồi** mã active cũ.
- Plain text mã chỉ trả trong response `generate` — không lưu DB, không hiện lại.

---

## 4. URL

### Frontend (GitHub Pages)

| URL | Trang |
|-----|-------|
| `.../nhat-ky.html` | Nhật ký (+ modal passcode đổi quà) |
| `.../admin/` | Redirect login hoặc dashboard |
| `.../admin/login.html` | Đăng nhập admin |
| `.../admin/dashboard.html` | Quản lý mã đổi quà |

Không link công khai tới `/admin` từ nav trang bé.

### API (VPS)

Base: `https://apinhatkyvumua.taho.cat/kho-thoc/`

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/admin/login` | Không |
| `GET` | `/admin/passcode` | JWT admin |
| `POST` | `/admin/passcode/generate` | JWT admin |
| `POST` | `/admin/passcode/revoke` | JWT admin |
| `POST` | `/` `{ type: "redeem", ... }` | Passcode đổi quà |
| `GET/POST` | `/` *(còn lại)* | Không *(Phase 2)* |

---

## 5. Database

Migration: `kho-thoc-api/migrations/002_redeem_auth.sql`

```sql
admin_users       — id, username, password_hash, created_at
redeem_passcodes  — id, passcode_hash, created_at, revoked_at, created_by, last_used_at
```

- Chỉ **một** mã active: `revoked_at IS NULL`.
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

### 6.2 Tạo mã đổi quà

```http
POST /kho-thoc/admin/passcode/generate
Authorization: Bearer <JWT>
Content-Type: application/json

{ "length": 4 }
```

Response `200`:

```json
{
  "passcode": "4829",
  "createdAt": "2026-06-10T12:00:00.000Z",
  "message": "Copy mã và gửi bố/mẹ qua Zalo. Mã cũ đã bị thu hồi."
}
```

### 6.3 Trạng thái mã

```http
GET /kho-thoc/admin/passcode
Authorization: Bearer <JWT>
```

Response `200`:

```json
{
  "active": true,
  "createdAt": "...",
  "lastUsedAt": "..." | null
}
```

### 6.4 Thu hồi mã

```http
POST /kho-thoc/admin/passcode/revoke
Authorization: Bearer <JWT>
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

1. Validate passcode (bcrypt, mã active).
2. Tính `totalCost` từ catalog quà server-side (không tin client).
3. Kiểm tra số dư Gạo.
4. Ghi log `tasks=REDEEM`, trừ Gạo.
5. Cập nhật `last_used_at`.

Response lỗi:

| HTTP | Trường hợp |
|------|------------|
| `403` | Mã sai / không có mã active |
| `400` | Thiếu field, không đủ Gạo, rewardIds không hợp lệ |

**Chặn bypass:** `POST type=log` với `tasks=REDEEM` bị từ chối — bắt buộc qua `type=redeem`.

---

## 7. Bảo mật

| Mục | Cách xử lý |
|-----|------------|
| Plain text passcode | Chỉ trả khi `generate`; DB chỉ hash |
| Brute force mã 4 số | Rate limit: 5 lần sai / 15 phút / profileId |
| Admin JWT | Hết hạn 7 ngày; `localStorage` key `kho_thoc_admin_token` |
| `JWT_SECRET` | Env trên VPS — không commit |
| HTTPS | Bắt buộc (đã có) |

---

## 8. Frontend

### 8.1 `nhat-ky.html`

- Modal passcode thay `confirm()` khi đổi quà.
- `redeemReward()`: chờ API success mới cập nhật balance/history.

### 8.2 Admin

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

---

## 10. Phase 3 (multi-tenant)

- Thêm `family_id` vào `admin_users`, `redeem_passcodes`, JWT.
- Mỗi gia đình một mã active riêng.
- Không phá contract API Phase 2.

---

## 11. Tham chiếu

- Kế hoạch tổng: [kehoach.md](../kehoach.md)
- Nghiệp vụ: [TAI-LIEU-NGHIEP-VU.md](../TAI-LIEU-NGHIEP-VU.md)
