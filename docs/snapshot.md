# Snapshot — Kho Thóc Gia Đình

**Ngày:** 10/06/2026  
**Mục đích:** Ghi lại trạng thái làm việc để tiếp tục session mới mà không mất ngữ cảnh.

---

## 1. Tóm tắt một dòng

Đang migrate backend **Google Apps Script + Sheets** → **VPS Docker API + PostgreSQL**. Phase 1 (code) **xong và test local OK**; **chưa deploy production** lên VPS / chưa cutover `API_URL` trên GitHub Pages.

---

## 2. Giai đoạn hiện tại

| Hạng mục | Trạng thái |
|----------|------------|
| Đánh giá & kế hoạch migrate | ✅ `docs/kehoach.md` |
| API `kho-thoc-api` (Node + Express + pg) | ✅ |
| DB user `kho_thoc` / database `kho_thoc` trên `eedt-postgres` | ✅ local · ⏳ VPS |
| Test API local (Docker :3001) | ✅ |
| Import CSV Sheets → Postgres | ⏳ có file `data/*.csv`, cần xác nhận đã import |
| Deploy VPS `/opt/nhatkyvumua` | ⏳ runbook sẵn, **chưa xác nhận hoàn tất** |
| HTTPS `apinhatkyvumua.taho.cat` | ⏳ cert **chưa** có trong LE (cần `certbot`) |
| Cutover `API_URL` GitHub Pages | ⏳ vẫn `localhost:3001` (dev) / GAS (production live) |
| Phase 2 Auth (passcode/JWT) | ❌ chưa làm |
| Phase 3 Multi-tenant | ❌ chưa làm |

---

## 3. Kiến trúc

### Production (hiện tại — user đang dùng)

```
https://batagic.github.io/keep-house-clean/nhat-ky.html
        → Google Apps Script → Google Sheets
```

### Mục tiêu (đang triển khai)

```
https://batagic.github.io/keep-house-clean/nhat-ky.html   (frontend — giữ nguyên)
        → https://apinhatkyvumua.taho.cat/kho-thoc        (API VPS)
                → kho-thoc-api (Docker :3001)
                → eedt-postgres / DB kho_thoc
```

### Local dev

```
python3 -m http.server 5500   (từ thư mục GỐC repo — không phải kho-thoc-api/)
http://localhost:5500/nhat-ky.html
        → http://localhost:3001   (kho-thoc-api Docker HOẶC npm run dev — không chạy cả hai)
        → eedt-postgres / kho_thoc
```

---

## 4. VPS (Vultr Singapore)

| Thành phần | Chi tiết |
|------------|----------|
| Host | `root@vultr` |
| Postgres | `eedt-postgres` (postgres:16-alpine), port 5432 |
| Superuser PG | `eedt` (không có role `postgres`) |
| Nginx Docker | `eedt-nginx` — `8082→80` (app eedt, HTTP) |
| **SSL terminate** | **Host Nginx** — `systemctl nginx` active, listen `:443` |
| Cert LE hiện có | `taho.cat`, `course.taho.cat`, `tienganhcodaisy.taho.cat` |
| Cert API cần tạo | `apinhatkyvumua.taho.cat` |
| Thư mục dự án (kế hoạch) | `/opt/nhatkyvumua/kho-thoc-api` |
| RAM | ~1 GB — dùng chung Postgres, không spin Postgres mới |

**Đã xác nhận trên VPS (10/06/2026):**

```bash
sudo systemctl status nginx   # active
sudo ss -tlnp | grep ':443'   # nginx listen 443
sudo ls /etc/letsencrypt/live/  # chưa có apinhatkyvumua.taho.cat
```

---

## 5. Domain & URL

| Mục | Giá trị |
|-----|---------|
| Frontend GitHub Pages | `https://batagic.github.io/keep-house-clean/nhat-ky.html` |
| API production (sau deploy) | `https://apinhatkyvumua.taho.cat/kho-thoc` |
| API local | `http://localhost:3001` (BASE_PATH rỗng) / `http://localhost:3001/kho-thoc` (VPS) |
| GAS rollback | `https://script.google.com/macros/s/AKfycbwrQ4WC4WnZ4X33RQScOnOG5RFHAVblqIYEhNVfHJENAAzRe-rGEN-5ICobJFp-oTHYeg/exec` |
| Google Sheet ID | `1JhOR_Ry5Z9h__wH288zVS2KtYPUD-8PgCWS1KZoErmU` |
| CORS bắt buộc | `https://batagic.github.io` |

---

## 6. `config.js` hiện tại

File: `assets/js/data/config.js`

```javascript
const API_URL = 'http://localhost:3001';   // ← đang dev local
// Production (chưa bật):
// const API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc';
// Rollback GAS: script.google.com/...
const API_USE_PLAIN_TEXT = API_URL.includes('script.google.com');
```

**Lưu ý:** Sửa `config.js` → chỉ cần hard refresh trình duyệt; không cần restart server.

---

## 7. PostgreSQL

### User / DB riêng (tách khỏi `eedt`)

| | |
|---|---|
| User | `kho_thoc` |
| Database | `kho_thoc` |
| Script tạo | `kho-thoc-api/scripts/setup-db.sh` |
| Script verify | `kho-thoc-api/scripts/verify-db.sh` |
| Bảng | `profiles`, `logs` — `migrations/001_init.sql` |

### Local

- Đã chạy `setup-db.sh` + `verify-db.sh` thành công
- Mật khẩu dev (trong `kho-thoc-api/.env`, **gitignore**): `kho_thoc_dev_local`
- Docker network local: `docker_eedt-net`

### VPS

- **Chưa xác nhận** đã chạy `setup-db.sh` — cần mật khẩu **riêng** cho production

---

## 8. Docker local

```bash
# API container
docker ps --filter name=kho-thoc-api

# Khởi động
cd kho-thoc-api && docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js

# Dừng (để chạy npm run dev thay thế)
docker compose down
```

| Container | Port | Ghi chú |
|-----------|------|---------|
| `kho-thoc-api` | `3001` | API Node |
| `eedt-postgres` | `5432` | DB chung |

**Không** chạy `npm run dev` và `docker compose` cùng lúc trên port 3001.

---

## 9. Import dữ liệu Sheets

File đặt tại `kho-thoc-api/data/`:

| File | Nội dung |
|------|----------|
| `profiles.csv` | `id, name, avatar, total_grain, total_exp` |
| `logs.csv` | `id, name, date, grain, exp, tasks, bonus, note` |

```bash
docker compose exec kho-thoc-api node scripts/import-csv.js \
  --profiles ./data/profiles.csv --logs ./data/logs.csv
```

Cần mount `data/` (đã có trong `docker-compose.yml`). Sau khi sửa compose: `docker compose up -d`.

---

## 10. Cấu trúc file mới (chưa commit git)

```
keep-house-clean/
├── kho-thoc-api/              # API backend Phase 1
│   ├── src/
│   ├── scripts/               # setup-db, verify-db, migrate, import-csv
│   ├── migrations/
│   ├── data/                  # profiles.csv, logs.csv
│   ├── docker-compose.yml
│   └── .env                   # local only, gitignored
├── deploy/vps/
│   ├── RUNBOOK-VPS.md         # ← runbook deploy từng lệnh
│   ├── HUONG-DAN-DEPLOY-VPS.md
│   ├── SSL-GIAI-THICH.md
│   └── nginx/apinhatkyvumua.taho.cat.conf
└── docs/
    ├── kehoach.md
    ├── HUONG-DAN-CAI-DAT.md
    ├── DEPLOY-PHASE1.md
    └── snapshot.md            # file này
```

### Git status (10/06/2026)

- Branch: `main`
- **Chưa commit:** toàn bộ `kho-thoc-api/`, `deploy/`, docs mới, sửa `config.js`, `nhat-ky.js`
- Commit gần nhất: `f99269f` dong bo ten nhiem vu toan du an

---

## 11. API contract (khớp GAS)

```
GET  ?type=ping | profiles | logs | (default all)
POST { type: log | delete_log | profile, ... }
```

VPS production: prefix `/kho-thoc` (`BASE_PATH=/kho-thoc` trong `.env`).

---

## 12. Bước tiếp theo (resume checklist)

### A. Commit code (khuyến nghị trước khi deploy VPS)

```bash
git add kho-thoc-api deploy docs assets/js
git commit -m "Phase 1: kho-thoc-api, deploy VPS docs, frontend API_USE_PLAIN_TEXT"
git push
```

### B. Deploy VPS — theo `deploy/vps/RUNBOOK-VPS.md`

1. `rsync` hoặc `git clone` → `/opt/nhatkyvumua`
2. `KHO_THOC_DB_PASSWORD='...' ./scripts/setup-db.sh` trên VPS
3. Tạo `.env` production (`BASE_PATH=/kho-thoc`, `CORS_ORIGINS=https://batagic.github.io`)
4. `docker compose up -d --build` + `migrate.js`
5. Import CSV nếu cần
6. Host Nginx HTTP → `certbot --nginx -d apinhatkyvumua.taho.cat`
7. `curl https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping`

### C. Cutover production

```javascript
// assets/js/data/config.js
const API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc';
```

`git push` → test `nhat-ky.html` trên GitHub Pages (ẩn danh).

### D. Sau Phase 1

- Phase 2: passcode admin/kid, JWT
- Phase 3: multi-tenant, bảng `families`, `redemptions`
- `pg_dump` cron backup

---

## 13. Rollback nhanh

Đổi `API_URL` về GAS trong `config.js` → push. Sheets vẫn nguyên.

---

## 14. Tài liệu tham chiếu

| File | Mục đích |
|------|----------|
| [kehoach.md](./kehoach.md) | Đánh giá + tiến độ + mục 10 tóm tắt |
| [HUONG-DAN-CAI-DAT.md](./HUONG-DAN-CAI-DAT.md) | Cài đặt local + VPS tổng quát |
| [deploy/vps/RUNBOOK-VPS.md](../deploy/vps/RUNBOOK-VPS.md) | **Lệnh copy-paste deploy VPS** |
| [deploy/vps/SSL-GIAI-THICH.md](../deploy/vps/SSL-GIAI-THICH.md) | SSL host vs container |
| [datasource/appscripv11.md](./datasource/appscripv11.md) | API GAS gốc |
| [datasource/session_snapshot.md](./datasource/session_snapshot.md) | Snapshot phiên cũ (GAS era) |

---

## 15. Câu hỏi mở / chưa xác nhận

- [ ] Đã deploy `/opt/nhatkyvumua` trên VPS chưa?
- [ ] Đã import CSV lên Postgres (local / VPS) chưa?
- [ ] DNS `apinhatkyvumua.taho.cat` → IP VPS đã propagate chưa?
- [ ] `EEDT_DOCKER_NETWORK` trên VPS có trùng `docker_eedt-net` không? (chạy `docker inspect eedt-postgres` trên VPS)

---

*Để bắt đầu session mới: đọc mục 12 (Bước tiếp theo) và mở `deploy/vps/RUNBOOK-VPS.md`.*
