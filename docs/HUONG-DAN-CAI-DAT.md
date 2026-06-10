# Hướng dẫn cài đặt — Kho Thóc (Phase 1)

Hướng dẫn từng bước: tạo **user + database PostgreSQL riêng** trên container `eedt-postgres` có sẵn, chạy API, kết nối frontend.

> **Nguyên tắc:** User `kho_thoc` và database `kho_thoc` **hoàn toàn tách biệt** khỏi user/DB `eedt`. Chỉ dùng chung **một container Postgres** — không tạo container Postgres mới.

---

## Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│  Container: eedt-postgres (postgres:16-alpine)          │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │ DB: eedt         │    │ DB: kho_thoc  ← MỚI      │  │
│  │ User: eedt       │    │ User: kho_thoc ← MỚI     │  │
│  │ (app cũ — KHÔNG  │    │ (Kho Thóc — độc lập)     │  │
│  │  bị thay đổi)    │    │                          │  │
│  └──────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
    eedt-api (cũ)              kho-thoc-api (mới)
```

---

## Phần A — Local (máy dev)

### Bước 0: Kiểm tra điều kiện

```bash
docker ps --filter name=eedt-postgres
```

Kỳ vọng: container `eedt-postgres` đang **Up (healthy)**, port `5432`.

Xem Docker network (ghi lại tên):

```bash
docker inspect eedt-postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
# Ví dụ local: docker_eedt-net
```

---

### Bước 1: Tạo user + database riêng

```bash
cd kho-thoc-api
chmod +x scripts/setup-db.sh scripts/verify-db.sh
```

Chọn mật khẩu mạnh (≥ 12 ký tự), **lưu lại** — dùng cho `.env` và VPS:

```bash
KHO_THOC_DB_PASSWORD='mat_khau_cua_ban' ./scripts/setup-db.sh
```

Script sẽ:
- Tạo role `kho_thoc` (login riêng, không quyền superuser)
- Tạo database `kho_thoc` (owner = `kho_thoc`)
- **Chặn** `kho_thoc` kết nối sang DB `eedt` và các DB khác

**Xác minh:**

```bash
KHO_THOC_DB_PASSWORD='mat_khau_cua_ban' ./scripts/verify-db.sh
```

Phải thấy `✅ kho_thoc bị chặn truy cập DB eedt`.

---

### Bước 2: Cấu hình `.env`

```bash
cp .env.example .env
```

Sửa `kho-thoc-api/.env`:

```env
PORT=3001
BASE_PATH=

# API chạy trong Docker → host = eedt-postgres
DATABASE_URL=postgresql://kho_thoc:mat_khau_cua_ban@eedt-postgres:5432/kho_thoc

CORS_ORIGINS=https://batagic.github.io,http://localhost:5500,http://127.0.0.1:5500
EEDT_DOCKER_NETWORK=docker_eedt-net
```

> Nếu chạy `npm run dev` **trên máy** (không Docker API), đổi host thành `localhost`:
> `postgresql://kho_thoc:mat_khau@localhost:5432/kho_thoc`

---

### Bước 3: Tạo bảng (migration)

**Cách A — Docker API (khuyến nghị):**

```bash
docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js
```

**Cách B — Node trên máy:**

```bash
npm install
# .env dùng localhost
npm run migrate
```

Kỳ vọng: `apply 001_init.sql` → `migrations done`.

---

### Bước 4: Kiểm tra API

```bash
curl -s 'http://localhost:3001/?type=ping'
# → {"result":"ok","ts":...}

curl -s 'http://localhost:3001/health'
# → {"status":"ok",...}

curl -s 'http://localhost:3001/?type=profiles'
# → {"profiles":[]}
```

Thử ghi dữ liệu:

```bash
curl -s -X POST 'http://localhost:3001/' \
  -H 'Content-Type: application/json' \
  -d '{"type":"profile","id":"p_demo","name":"Bé Demo","avatar":"👶"}'
```

---

### Bước 5: Import dữ liệu từ Google Sheets (tùy chọn)

1. Mở Google Spreadsheet → sheet **Profiles** → File → Download → CSV  
2. Tương tự sheet **Logs**  
3. Đặt file vào `kho-thoc-api/data/` (tạo thư mục nếu chưa có)

```bash
docker compose exec kho-thoc-api node scripts/import-csv.js \
  --profiles ./data/profiles.csv \
  --logs ./data/logs.csv
```

---

### Bước 6: Chạy frontend

Mở file tĩnh local (Live Server, hoặc):

```bash
# Từ thư mục gốc repo
python3 -m http.server 5500
```

Truy cập: `http://localhost:5500/nhat-ky.html`

**Chưa cần đổi API_URL** nếu vẫn test GAS. Để dùng API local, sửa `assets/js/data/config.js`:

```javascript
const API_URL = 'http://localhost:3001';
```

Push lên GitHub Pages cần HTTPS — local dùng `http://localhost:3001` được.

---

## Phần B — VPS (production)

Lặp lại **cùng các bước** trên VPS qua SSH. Khác biệt chính:

| Hạng mục | Local | VPS |
|----------|-------|-----|
| `EEDT_DOCKER_NETWORK` | `docker_eedt-net` (kiểm tra thực tế) | có thể `eedt_default` — chạy `docker inspect` |
| `BASE_PATH` | để trống | `/kho-thoc` |
| `API_URL` frontend | `http://localhost:3001` | `https://api.<domain>/kho-thoc` |
| HTTPS | không bắt buộc | **bắt buộc** (GitHub Pages) |

### B1. SSH vào VPS, vào thư mục dự án

```bash
cd /path/to/keep-house-clean/kho-thoc-api
```

### B2. Tạo DB (mật khẩu **riêng** cho VPS hoặc cùng local — tùy bạn)

```bash
KHO_THOC_DB_PASSWORD='mat_khau_vps' ./scripts/setup-db.sh
KHO_THOC_DB_PASSWORD='mat_khau_vps' ./scripts/verify-db.sh
```

### B3. `.env` production

```env
PORT=3001
BASE_PATH=/kho-thoc
DATABASE_URL=postgresql://kho_thoc:mat_khau_vps@eedt-postgres:5432/kho_thoc
CORS_ORIGINS=https://batagic.github.io
EEDT_DOCKER_NETWORK=<tên_network_thực_tế>
```

### B4. Deploy container

```bash
docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js
free -h && docker stats --no-stream   # kiểm tra RAM
```

### B5. Nginx + HTTPS

Thêm vào config site (sau khi có SSL):

```nginx
location /kho-thoc/ {
    proxy_pass http://kho-thoc-api:3001/kho-thoc/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Reload Nginx, test:

```bash
curl -s 'https://api.<domain>/kho-thoc/?type=ping'
```

### B6. Cutover frontend

`assets/js/data/config.js`:

```javascript
const API_URL = 'https://api.<domain>/kho-thoc';
```

Commit + push → GitHub Pages tự cập nhật.

### B7. Backup

```bash
docker exec eedt-postgres pg_dump -U kho_thoc kho_thoc > backup_kho_thoc_$(date +%F).sql
```

Cron hàng ngày (khuyến nghị).

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| `role "postgres" does not exist` | Superuser stack eedt là `eedt` | Dùng `setup-db.sh` (mặc định `-U eedt`) |
| `password authentication failed` | Sai mật khẩu trong `.env` | Khớp với `KHO_THOC_DB_PASSWORD` lúc setup |
| `network ... not found` | Sai `EEDT_DOCKER_NETWORK` | `docker inspect eedt-postgres` → sửa `.env` |
| `could not translate host name "eedt-postgres"` | Chạy `npm run dev` trên host nhưng URL dùng hostname Docker | Đổi host → `localhost` |
| CORS error từ GitHub Pages | Thiếu origin | Thêm `https://batagic.github.io` vào `CORS_ORIGINS` |
| Mixed content | Frontend HTTPS gọi API HTTP | Bật HTTPS cho API (Nginx + Let's Encrypt) |
| `database "kho_thoc" does not exist` | Chưa chạy setup-db | `./scripts/setup-db.sh` |

---

## Rollback

Đổi lại `API_URL` trong `config.js` về Google Apps Script → push. Dữ liệu Sheets vẫn nguyên.

Xóa hoàn toàn DB kho_thoc (cẩn thận):

```bash
docker exec -it eedt-postgres psql -U eedt -c "DROP DATABASE IF EXISTS kho_thoc;"
docker exec -it eedt-postgres psql -U eedt -c "DROP ROLE IF EXISTS kho_thoc;"
```

Không ảnh hưởng DB `eedt`.

---

## Tham chiếu nhanh

| File | Mục đích |
|------|----------|
| `kho-thoc-api/scripts/setup-db.sh` | Tạo user + DB |
| `kho-thoc-api/scripts/verify-db.sh` | Kiểm tra tách biệt |
| `kho-thoc-api/scripts/migrate.js` | Tạo bảng `profiles`, `logs` |
| `kho-thoc-api/.env` | Cấu hình kết nối (không commit) |
| `assets/js/data/config.js` | `API_URL` frontend |
