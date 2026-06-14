# Cài đặt — Kho Thóc

Hướng dẫn cài đặt **lần đầu**: macOS (dev local) và VPS (production).  
Sau khi VPS đã chạy → xem [operator.md](./operator.md) (deploy tính năng mới, xử lý sự cố).

**Nguyên tắc DB:** User `kho_thoc` và database `kho_thoc` tách biệt khỏi `eedt`. Chỉ dùng chung container `eedt-postgres` — không tạo Postgres mới.

---

## Kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│  Container: eedt-postgres (postgres:16-alpine)          │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │ DB: eedt         │    │ DB: kho_thoc             │  │
│  │ User: eedt       │    │ User: kho_thoc           │  │
│  └──────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ▲                           ▲
    eedt-api (cũ)              kho-thoc-api (mới)
```

| Môi trường | Frontend | API | `BASE_PATH` | `API_URL` (config.js) |
|------------|----------|-----|-------------|------------------------|
| macOS local | `python3 -m http.server 5500` | Docker `:3001` hoặc `npm run dev` | trống | `http://localhost:3001` |
| Production | GitHub Pages | VPS Docker | `/kho-thoc` | `https://apinhatkyvumua.taho.cat/kho-thoc/` (**có `/` cuối**) |

**Thông số VPS:** IP `64.176.85.165` · Domain `apinhatkyvumua.taho.cat` · Thư mục `/opt/nhatkyvumua`

---

## Phần A — macOS (máy dev)

### A0. Điều kiện

```bash
docker ps --filter name=eedt-postgres
```

Kỳ vọng: `eedt-postgres` **Up (healthy)**, port `5432`.

```bash
docker inspect eedt-postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
# Ghi lại tên network, ví dụ: docker_eedt-net
```

### A1. Tạo user + database

```bash
cd code/kho-thoc-api
chmod +x scripts/setup-db.sh scripts/verify-db.sh

KHO_THOC_DB_PASSWORD='mat_khau_cua_ban' ./scripts/setup-db.sh
KHO_THOC_DB_PASSWORD='mat_khau_cua_ban' ./scripts/verify-db.sh
```

Phải thấy: `✅ kho_thoc bị chặn truy cập DB eedt`.

### A2. File `.env`

```bash
cp .env.example .env
```

```env
PORT=3001
BASE_PATH=
DATABASE_URL=postgresql://kho_thoc:mat_khau_cua_ban@eedt-postgres:5432/kho_thoc
CORS_ORIGINS=https://batagic.github.io,http://localhost:5500,http://127.0.0.1:5500
EEDT_DOCKER_NETWORK=docker_eedt-net
```

> Chạy `npm run dev` trên Mac (không Docker API): đổi host DB thành `localhost`.

### A3. Migration + chạy API

```bash
docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js
```

Hoặc Node trên máy: `npm install && npm run migrate && npm run dev`

### A4. Kiểm tra API

```bash
curl -s 'http://localhost:3001/?type=ping'
curl -s 'http://localhost:3001/?type=profiles'
```

### A5. Import CSV (tùy chọn)

Export **Profiles** và **Logs** từ Google Sheets → đặt vào `code/kho-thoc-api/data/`:

```bash
docker compose exec kho-thoc-api node scripts/import-csv.js \
  --profiles ./data/profiles.csv --logs ./data/logs.csv
```

### A6. Frontend local

```bash
# Từ thư mục gốc repo
python3 -m http.server 5500
```

Mở `http://localhost:5500/nhat-ky.html`. Để dùng API local, sửa `assets/js/data/config.js`:

```javascript
const API_URL = 'http://localhost:3001';
```

**Không** chạy `npm run dev` và `docker compose` cùng lúc trên port 3001.

---

## Phần B — VPS (cài lần đầu)

### B0. DNS

Hostinger → **A record**: `apinhatkyvumua` → `64.176.85.165`

```bash
dig +short apinhatkyvumua.taho.cat @8.8.8.8
```

Nếu cache Mac: `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`

### B1. Đưa code lên VPS

**Cách A — Git clone (khuyến nghị):**

```bash
mkdir -p /opt/nhatkyvumua && cd /opt/nhatkyvumua
git clone https://github.com/batagic/keep-house-clean.git repo
rsync -a repo/code/kho-thoc-api/ ./kho-thoc-api/ --exclude node_modules --exclude .env --exclude data
# migrations/ đã nằm trong kho-thoc-api/ (nguồn chạy) — xem docs/db/README.md
mkdir -p kho-thoc-api/data && chmod +x kho-thoc-api/scripts/*.sh
```

**Cách B — rsync từ Mac** (trước đó trên VPS: `mkdir -p /opt/nhatkyvumua/repo`):

```bash
rsync -avz --exclude node_modules --exclude .env \
  /Users/thao/DATA/Development/projects/NhatKyVuMua/keep-house-clean/ \
  root@64.176.85.165:/opt/nhatkyvumua/repo/

# Trên VPS:
cd /opt/nhatkyvumua
rsync -a repo/code/kho-thoc-api/ ./kho-thoc-api/ --exclude node_modules --exclude .env --exclude data
# migrations/ đã nằm trong kho-thoc-api/ (nguồn chạy) — xem docs/db/README.md
mkdir -p kho-thoc-api/data && chmod +x kho-thoc-api/scripts/*.sh
```

Cấu trúc:

```text
/opt/nhatkyvumua/
├── repo/            ← git pull ở đây
└── kho-thoc-api/    ← Docker chạy thật (rsync sau mỗi pull)
```

### B2. Docker network

```bash
docker inspect eedt-postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

### B3. Database

```bash
cd /opt/nhatkyvumua/kho-thoc-api
export KHO_THOC_DB_PASSWORD='MAT_KHAU_DB_MANH'
./scripts/setup-db.sh && ./scripts/verify-db.sh
```

### B4. File `.env` production

```bash
JWT_SECRET=$(openssl rand -base64 48)

cat > /opt/nhatkyvumua/kho-thoc-api/.env << EOF
PORT=3001
BASE_PATH=/kho-thoc
DATABASE_URL=postgresql://kho_thoc:MAT_KHAU_DB_MANH@eedt-postgres:5432/kho_thoc
CORS_ORIGINS=https://batagic.github.io
EEDT_DOCKER_NETWORK=docker_eedt-net
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
EOF

nano /opt/nhatkyvumua/kho-thoc-api/.env   # sửa mật khẩu thật
```

### B5. Chạy API + seed admin

```bash
cd /opt/nhatkyvumua/kho-thoc-api
docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js
docker compose exec kho-thoc-api npm run seed:admin -- \
  --username admin --password 'MAT_KHAU_ADMIN'

curl -s 'http://127.0.0.1:3001/kho-thoc/?type=ping'
```

### B6. Import CSV (nếu có)

```bash
# Từ Mac:
scp kho-thoc-api/data/profiles.csv kho-thoc-api/data/logs.csv \
  root@64.176.85.165:/opt/nhatkyvumua/kho-thoc-api/data/

# Trên VPS:
docker compose exec kho-thoc-api node scripts/import-csv.js \
  --profiles ./data/profiles.csv --logs ./data/logs.csv
```

### B7. Nginx + SSL (Host Nginx)

`eedt-nginx` chỉ HTTP `:8082` — SSL terminate trên **Host Nginx** (`systemctl nginx`). Chi tiết: [operations.md § SSL](./operations.md#ssl-terminate).

**Site HTTP tạm** (certbot cần port 80):

```bash
cat > /etc/nginx/sites-available/apinhatkyvumua.taho.cat << 'EOF'
server {
    listen 80;
    server_name apinhatkyvumua.taho.cat;
    location /kho-thoc {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/apinhatkyvumua.taho.cat /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

```bash
certbot --nginx -d apinhatkyvumua.taho.cat
cp /opt/nhatkyvumua/repo/ops/vps/nginx/apinhatkyvumua.taho.cat.conf \
   /etc/nginx/sites-available/apinhatkyvumua.taho.cat
nginx -t && systemctl reload nginx
```

Kiểm tra **200** (không 301):

```bash
curl -sI 'https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping' | head -1
```

### B8. Cutover frontend (GitHub Pages)

`assets/js/data/config.js`:

```javascript
const API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc/';
const ADMIN_API_URL = API_URL.replace(/\/?$/, '/') + 'admin/';
```

```bash
git add assets/js/data/config.js admin/
git commit -m "Cutover API production"
git push
```

Đợi 1–2 phút → test ẩn danh: `nhat-ky.html`, `admin/login.html`. Network tab status **200**.

### B9. Kiểm tra RAM

```bash
free -h && docker stats --no-stream
```

---

## Xử lý lỗi cài đặt

| Lỗi | Cách sửa |
|-----|----------|
| `role "postgres" does not exist` | Dùng `setup-db.sh` (superuser `eedt`) |
| `password authentication failed` | Khớp mật khẩu `.env` với lúc `setup-db.sh` |
| `network ... not found` | Sửa `EEDT_DOCKER_NETWORK` theo `docker inspect eedt-postgres` |
| `could not translate host name "eedt-postgres"` | `npm run dev` trên host → host DB = `localhost` |
| rsync `mkdir failed` | `mkdir -p /opt/nhatkyvumua/repo` trên VPS trước |
| `dig` trống | A record Hostinger; `dig @8.8.8.8`; flush DNS Mac |
| Network **301** / CORS | `API_URL` có `/` cuối; Nginx config từ repo (B7) |
| Mixed content | Bật HTTPS API trước khi cutover GitHub Pages |

Lỗi khi **deploy tính năng mới** hoặc **vận hành hàng ngày** → [operations.md](./operations.md).

---

## Rollback

**Frontend:** đổi `API_URL` về Google Apps Script trong `config.js` → push.

**Xóa DB** (cẩn thận):

```bash
docker exec -it eedt-postgres psql -U eedt -c "DROP DATABASE IF EXISTS kho_thoc;"
docker exec -it eedt-postgres psql -U eedt -c "DROP ROLE IF EXISTS kho_thoc;"
```

---

## Tham chiếu

| File | Mục đích |
|------|----------|
| [operations.md](./operations.md) | Deploy tính năng mới, sự cố, backup |
| [code/kho-thoc-api/README.md](../../code/kho-thoc-api/README.md) | API contract |
| `code/kho-thoc-api/scripts/setup-db.sh` | Tạo user + DB |
| `ops/vps/nginx/apinhatkyvumua.taho.cat.conf` | Config Nginx HTTPS |
