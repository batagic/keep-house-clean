# Spec — Trang Admin (Phase 2)

**Phiên bản:** 1.0  
**Ngày:** 10/06/2026  
**Liên quan:** [passcode.md](./passcode.md) · [brd.md](./brd.md)

---

## 1. Mục tiêu

Trang `/admin` cho bố/mẹ / vận hành: đăng nhập bằng **tài khoản admin**, quản lý **mã đổi quà** theo từng bé (sinh mới, thu hồi). Không link công khai từ nav trang bé.

---

## 2. Luồng

```
Admin → /admin/login → username + password → JWT
→ /admin/dashboard (sidebar + main)
→ Danh sách bé + trạng thái mã → Sinh mã mới / Thu hồi
→ Copy plain text → gửi Zalo cho bố/mẹ (khi quên mã)
```

- **Sinh mã mới:** thu hồi mã active cũ của bé đó; plain text trả **một lần**.
- Bé import CSV trước Phase 2: chưa có mã → admin sinh mã từng bé.

---

## 3. URL

| URL | Trang |
|-----|-------|
| `.../admin/` | Redirect login hoặc dashboard |
| `.../admin/login.html` | Đăng nhập |
| `.../admin/dashboard.html` | Quản trị mã đổi quà |

Base API: `https://apinhatkyvumua.taho.cat/kho-thoc/admin/`

---

## 4. API

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/admin/login` | Không |
| `GET` | `/admin/passcode` | JWT |
| `POST` | `/admin/passcode/generate` | JWT |
| `POST` | `/admin/passcode/revoke` | JWT |

### Login

```http
POST /kho-thoc/admin/login
{ "username": "admin", "password": "..." }
→ { "token": "<JWT>", "expiresIn": 604800 }
```

JWT payload: `{ "sub": "admin:1", "role": "admin", "exp": ... }`

### Danh sách bé

```http
GET /kho-thoc/admin/passcode
Authorization: Bearer <JWT>
→ { "profiles": [{ "profileId", "profileName", "hasActivePasscode", ... }] }
```

### Sinh mã

```http
POST /kho-thoc/admin/passcode/generate
{ "profileId": "p_...", "length": 4 }
→ { "passcode": "4829", "message": "..." }
```

### Thu hồi

```http
POST /kho-thoc/admin/passcode/revoke
{ "profileId": "p_..." }
```

---

## 5. Database

```sql
admin_users — id, username, password_hash, created_at
```

Seed: `npm run seed:admin -- --username admin --password '...'`

Env: `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS`

---

## 6. Frontend

| File | Vai trò |
|------|---------|
| `assets/js/shared/admin-auth.js` | JWT, `adminFetch()` |
| `assets/js/pages/admin-login.js` | Form đăng nhập |
| `assets/js/pages/admin-dashboard.js` | Bảng bé + Sinh/Thu hồi |
| `assets/css/pages/admin.css` | Layout sidebar + main |

`config.js`:

```javascript
const ADMIN_API_URL = API_URL.replace(/\/?$/, '/') + 'admin/';
```

Token: `localStorage` key `kho_thoc_admin_token` · hết hạn 7 ngày.

---

## 7. Bảo mật

| Mục | Xử lý |
|-----|--------|
| Mật khẩu admin | bcrypt trong DB |
| `JWT_SECRET` | Env VPS — không commit |
| HTTPS | Bắt buộc |
| Nav trang bé | Không link `/admin` |

---

## 8. Triển khai

Xem [operations.md](../operations.md) — loại **D** (UI + API). Cần `seed:admin` sau migrate `002_redeem_auth.sql`.
