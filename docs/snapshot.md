# Snapshot — Kho Thóc Gia Đình

**Ngày:** 10/06/2026  
**Mục đích:** Ghi lại trạng thái làm việc để tiếp tục session mới mà không mất ngữ cảnh.

---

## 1. Tóm tắt một dòng

Đang migrate backend **Google Apps Script + Sheets** → **VPS Docker API + PostgreSQL**. Phase 1 deploy VPS **đã chạy** (API + HTTPS OK); cutover `API_URL` trên GitHub Pages **đang hoàn tất** (cần `API_URL` có trailing `/`).

---

## 2. Giai đoạn hiện tại

| Hạng mục | Trạng thái |
|----------|------------|
| Đánh giá & kế hoạch migrate | ✅ `docs/kehoach.md` |
| API `kho-thoc-api` (Node + Express + pg) | ✅ |
| DB user `kho_thoc` / database `kho_thoc` trên `eedt-postgres` | ✅ local · ✅ VPS |
| Test API local (Docker :3001) | ✅ |
| Import CSV Sheets → Postgres | ⏳ có file `data/*.csv`, cần xác nhận đã import VPS |
| Deploy VPS `/opt/nhatkyvumua` | ✅ API ping OK trên `:3001` |
| HTTPS `apinhatkyvumua.taho.cat` | ✅ certbot + Nginx host |
| Cutover `API_URL` GitHub Pages | ⏳ `.../kho-thoc/` (trailing `/` bắt buộc) |
| Phase 2 Auth (passcode/JWT) | ❌ chưa làm |
| Phase 3 Multi-tenant | ❌ chưa làm |

---

## 3. Kiến trúc

### Production (sau cutover)

```
https://batagic.github.io/keep-house-clean/nhat-ky.html   (frontend — giữ nguyên)
        → https://apinhatkyvumua.taho.cat/kho-thoc/       (API VPS — có / cuối)
                → kho-thoc-api (Docker :3001)
                → eedt-postgres / DB kho_thoc
```

### Rollback

```
config.js → API_URL về Google Apps Script → push
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
| Cert LE | `apinhatkyvumua.taho.cat` (+ các subdomain khác) |
| Thư mục dự án | `/opt/nhatkyvumua/kho-thoc-api` · repo mirror `/opt/nhatkyvumua/repo` |
| IP VPS | `64.176.85.165` |
| RAM | ~1 GB — dùng chung Postgres, không spin Postgres mới |

**Đã xác nhận (10/06/2026):**

```bash
curl -s 'http://127.0.0.1:3001/kho-thoc/?type=ping'   # {"result":"ok",...}
dig +short apinhatkyvumua.taho.cat @8.8.8.8           # 64.176.85.165
curl -s 'https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping'  # OK sau certbot
```

---

## 5. Domain & URL

| Mục | Giá trị |
|-----|---------|
| Frontend GitHub Pages | `https://batagic.github.io/keep-house-clean/nhat-ky.html` |
| API production | `https://apinhatkyvumua.taho.cat/kho-thoc/` (**có `/` cuối** trong `config.js`) |
| API local | `http://localhost:3001` (BASE_PATH rỗng) / `http://localhost:3001/kho-thoc` (VPS) |
| GAS rollback | `https://script.google.com/macros/s/AKfycbwrQ4WC4WnZ4X33RQScOnOG5RFHAVblqIYEhNVfHJENAAzRe-rGEN-5ICobJFp-oTHYeg/exec` |
| Google Sheet ID | `1JhOR_Ry5Z9h__wH288zVS2KtYPUD-8PgCWS1KZoErmU` |
| CORS bắt buộc | `https://batagic.github.io` |

---

## 6. `config.js` hiện tại

File: `assets/js/data/config.js`

```javascript
const API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc/'; // trailing / bắt buộc
// Local dev: const API_URL = 'http://localhost:3001';
const API_USE_PLAIN_TEXT = API_URL.includes('script.google.com');
```

**Lưu ý:** `API_URL` production **phải** kết thúc bằng `/` — frontend ghép `?type=...` ngay sau. Thiếu `/` → Nginx 301 → CORS fail trên GitHub Pages.

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

- Đã chạy `setup-db.sh` + `verify-db.sh`
- Mật khẩu production **riêng** (không dùng `kho_thoc_dev_local`)

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

### A. Deploy lại từ đầu

Mở **[deploy/vps/RUNBOOK-VPS.md](../deploy/vps/RUNBOOK-VPS.md)** — lệnh copy-paste đầy đủ.

### B. Bài học deploy lần 1 (tránh lặp lỗi)

| Lỗi gặp | Cách tránh |
|---------|------------|
| rsync `mkdir failed` | `mkdir -p /opt/nhatkyvumua/repo` trên VPS **trước** rsync |
| `dig` trống | A record Hostinger; kiểm tra `dig @8.8.8.8`; flush DNS Mac |
| Network tab **301** | `API_URL = '.../kho-thoc/'` (có `/` cuối); Nginx không `return 301` nội bộ |

### C. Việc còn lại

- [ ] Push `config.js` với trailing `/` nếu chưa
- [ ] Import CSV lên VPS (nếu cần)
- [ ] Test end-to-end ẩn danh — Network status **200** (không 301)
- [ ] `pg_dump` cron backup

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

- [x] Deploy `/opt/nhatkyvumua` trên VPS
- [x] DNS `apinhatkyvumua.taho.cat` → `64.176.85.165`
- [x] HTTPS + API ping
- [ ] Import CSV lên Postgres VPS
- [ ] End-to-end GitHub Pages (Network 200)
- [ ] Cron backup `pg_dump`

---

*Để bắt đầu session mới: đọc mục 12 (Bước tiếp theo) và mở `deploy/vps/RUNBOOK-VPS.md`.*
