# Kiến trúc hạ tầng — Kho Thóc Gia Đình

**Cập nhật:** 10/06/2026  
**Trạng thái:** Đang thảo luận / chưa triển khai

---

## Tổng quan

Nâng cấp từ mô hình single-family (GitHub Pages + Google Apps Script + Google Sheets) sang **multi-tenant** (~100 gia đình): passcode admin/kid, tách dữ liệu theo gia đình.

| Thành phần | Vai trò |
|------------|---------|
| **GitHub Pages** | Frontend tĩnh (HTML/CSS/JS) — **giữ nguyên, miễn phí** |
| **VPS Vultr** | Host API + PostgreSQL (dùng chung instance Postgres sẵn có) |
| **kho-thoc-api** | Backend Node.js thay Google Apps Script |

---

## Frontend: GitHub Pages (giữ nguyên)

**Có — hoàn toàn khả thi.** Kiến trúc mới tách rõ hai lớp:

| Lớp | Host | Công nghệ | Ghi chú |
|-----|------|-----------|---------|
| **Frontend** | GitHub Pages | HTML, CSS, JS thuần | Không cần build, không cần Node trên GitHub |
| **Backend** | VPS Vultr | Node.js API + PostgreSQL | Thay Google Apps Script + Sheets |

Trình duyệt tải file tĩnh từ `batagic.github.io`, sau đó gọi API trên VPS qua `fetch()` — giống cách đang gọi Google Apps Script, chỉ đổi `API_URL`.

### Điều kiện để chạy được

1. **API phải HTTPS** — GitHub Pages chỉ serve qua HTTPS; trình duyệt chặn gọi API HTTP (mixed content).
2. **CORS** — API trên VPS cho phép origin `https://batagic.github.io`.
3. **Không cần đổi host frontend** — push HTML lên repo `keep-house-clean` như hiện tại.

### Thay đổi trên frontend (tối thiểu)

- Đổi `API_URL` từ Apps Script sang URL VPS, ví dụ `https://api.<domain>/kho-thoc`.
- **Phiên gia đình:** `POST unlock_family` → lưu `family_id` localStorage; header `X-Family-Id` trên mọi request sau đó.
- **Đổi quà:** modal passcode mỗi lần (`type=redeem`) — không lưu mã trên client.
- Chi tiết: [family-session.md](../brd/family-session.md).

### Không cần thay đổi

- Cách deploy frontend (`git push` → GitHub Pages tự cập nhật).
- Cấu trúc file HTML/CSS/JS hiện tại trong `code/` (`index.html`, `nhat-ky.html`, `kho-qua.html`, …).
- Framework — vẫn không bắt buộc React/Vite nếu không muốn.

---

## Sơ đồ luồng

```
Người dùng (trình duyệt)
    │
    ├──────────────────────────────────────┐
    │                                      │
    ▼                                      ▼
GitHub Pages (miễn phí)              VPS Vultr
batagic.github.io/keep-house-clean     Nginx (host hoặc eedt-nginx mở rộng)
    │                                      ├── :8080  → WordPress (blog)
    │  HTML/CSS/JS tĩnh                    ├── :8082  → eedt app
    │                                      └── :443   → kho-thoc-api (mới)
    │                                               │
    └──────── fetch (HTTPS + CORS) ────────────────┘
                                                    │
                                                    ▼
                                            Docker:
                                              eedt-postgres  ← DB chung, 2 database
                                              kho-thoc-api   ← container mới (port nội bộ 3001)
                                              (các container cũ giữ nguyên)
```

**Luồng request điển hình**

1. User mở `https://batagic.github.io/keep-house-clean/code/nhat-ky.html`
2. GitHub Pages trả file HTML/JS/CSS
3. JS gọi `https://api.<domain>/kho-thoc/...` (VPS)
4. API đọc/ghi PostgreSQL (`kho_thoc` database) và trả JSON

---

## VPS hiện tại (Vultr)

| Thông số | Giá trị |
|----------|---------|
| Location | Singapore |
| vCPU / RAM | 1 vCPU / 1 GB |
| Storage | 25 GB NVMe |
| OS | Ubuntu 22.04 x64 |
| Auto Backups | Enabled |

### Container đang chạy

| Container | Image | Port | Ghi chú |
|-----------|-------|------|---------|
| `taho_web` | wordpress:latest | 8080→80 | Blog |
| `taho_mysql` | mysql:8.0 | 3316→3306 | DB WordPress |
| `eedt-api` | docker-api | 3000 (nội bộ) | App eedt |
| `eedt-nginx` | nginx:alpine | 8082→80 | Reverse proxy eedt |
| `eedt-postgres` | postgres:16-alpine | 5432 (nội bộ) | **Dùng chung — thêm DB mới** |
| `eedt-redis` | redis:7-alpine | 6379 (nội bộ) | Cache eedt |
| *(ngoài docker)* | Bot Telegram | — | Process riêng |

### Ràng buộc tài nguyên

- **1 GB RAM** là điểm nghẽn chính — **không** thêm container PostgreSQL riêng.
- **Khuyến nghị:** tạo database + user mới trong `eedt-postgres` thay vì spin Postgres thứ hai.
- **Dài hạn:** nâng VPS lên 2 GB RAM nếu muốn tách stack hoặc tăng độ ổn định.

---

## Thành phần mới (keep-house-clean)

### kho-thoc-api

- Container Docker mới, Node.js (Express/Fastify + `pg`).
- Port nội bộ: **3001**.
- Logic API port từ `tech/legacy/apps-script-v11.md`: profiles, logs, redemptions, auth passcode.
- Process: `pm2` hoặc Docker healthcheck; env qua `.env` (không commit secret).

### Database (trong eedt-postgres)

```bash
# Tạo user + DB trên eedt-postgres (superuser: eedt)
docker exec -i eedt-postgres psql -U eedt < kho-thoc-api/scripts/init-db.sql
```

| Database | Ứng dụng |
|----------|----------|
| `eedt` (hoặc tên hiện tại) | App eedt |
| `kho_thoc` | Kho Thóc Gia Đình |

**Multi-tenant:** `profiles.family_id`; API filter theo `X-Family-Id` sau khi client mở phiên passcode ([family-session.md](../brd/family-session.md)).

### Bảng dự kiến (nháp)

```
families       — id, name, admin_passcode_hash, kid_passcode_hash, ...
profiles       — id, family_id, name, avatar
logs           — id, family_id, profile_id, date, grain, exp, tasks, bonus, note
redemptions    — id, family_id, profile_id, reward_id, grain_spent, ...
```

---

## Bảo mật

- PostgreSQL **không** expose port 5432 ra internet — chỉ Docker network / localhost.
- API bắt buộc **HTTPS** (Let's Encrypt qua Nginx/Caddy) — **bắt buộc** khi frontend trên GitHub Pages.
- **CORS:** cho phép `https://batagic.github.io` (và domain riêng nếu có).
- Passcode lưu **hash** (bcrypt), không plain text.
- Không commit `DATABASE_URL`, `JWT_SECRET` vào repo.
- Secret API chỉ nằm trên VPS (env / Docker secrets), không đưa vào repo GitHub Pages.

---

## Việc còn lại (backlog)

### Phase 1 (code — xong)

- [x] Schema SQL + migration — `kho-thoc-api/migrations/`
- [x] `kho-thoc-api` routes map `doGet` / `doPost`
- [x] `docker-compose` API only (`eedt-postgres` sẵn có)
- [x] Frontend `API_USE_PLAIN_TEXT` — `assets/js/data/config.js`

### Phase 1 (VPS — chờ deploy)

- [ ] Cấu hình Nginx route `:443` → `kho-thoc-api:3001`
- [ ] Cutover `API_URL` sang VPS
- [ ] Backup `kho_thoc` (pg_dump cron)
- [ ] Kiểm tra `free -h` / `docker stats` trước khi deploy

→ Xem [operations.md](../../operations.md)

### Phase 2+

- [ ] Phiên gia đình: `unlock_family` + modal tầng 1 trên `nhat-ky.html` — [family-session.md](../brd/family-session.md)

---

## Tham chiếu

- Nghiệp vụ: `specs/brd.md`
- API hiện tại (Apps Script): `tech/legacy/apps-script-v11.md`
- Frontend live: https://batagic.github.io/keep-house-clean/code/
