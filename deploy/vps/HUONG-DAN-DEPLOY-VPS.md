# Deploy VPS — GitHub Pages gọi API Docker

Frontend **giữ trên GitHub Pages** (`https://batagic.github.io/keep-house-clean/nhat-ky.html`).  
Chỉ deploy **API + Postgres** lên VPS trong `/opt/nhatkyvumua`.

```
Trình duyệt
    │ ① HTML/JS/CSS
    ▼
GitHub Pages (HTTPS)
    │ ② fetch API_URL
    ▼
VPS: Nginx (HTTPS) → kho-thoc-api (Docker) → eedt-postgres / DB kho_thoc
```

---

## Thông số VPS của bạn

| Hạng mục | Giá trị |
|----------|---------|
| Domain API | `apinhatkyvumua.taho.cat` |
| URL API sau deploy | `https://apinhatkyvumua.taho.cat/kho-thoc/` (**có dấu `/` cuối**) |
| Postgres | `eedt-postgres` (dùng chung) |
| Nginx Docker | `eedt-nginx` — `:8082→80` (HTTP, app eedt) |
| SSL | **Khả năng cao: Host Nginx :443** — xem [SSL-GIAI-THICH.md](./SSL-GIAI-THICH.md) |

Thư mục dự án: `/opt/nhatkyvumua/kho-thoc-api`

---

## Chuẩn bị (trước khi SSH)

| Hạng mục | Giá trị | Ghi chú |
|----------|---------|---------|
| Domain API | `apinhatkyvumua.taho.cat` | DNS **A record** → IP VPS |
| VPS | đã có `eedt-postgres`, Nginx Docker | không tạo Postgres mới |
| Mật khẩu DB | ≥ 12 ký tự | lưu password manager |
| File CSV | `profiles.csv`, `logs.csv` | export từ Google Sheets |

**URL API** (dùng trong `config.js` — **bắt buộc có `/` cuối**):

```text
https://apinhatkyvumua.taho.cat/kho-thoc/
```

> Frontend ghép `${API_URL}?type=profiles` → `/kho-thoc/?type=profiles`.  
> Nếu thiếu `/` cuối → `/kho-thoc?type=...` → Nginx **301** → `fetch` từ GitHub Pages **bị chặn CORS**.

---

## Bước 1 — SSH vào VPS

```bash
ssh user@<IP_VPS>
```

Kiểm tra container sẵn có:

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' | grep -E 'eedt-postgres|nginx|kho-thoc'
free -h
```

Kỳ vọng: `eedt-postgres` **Up (healthy)**.

---

## Bước 2 — Tạo thư mục dự án `/opt/nhatkyvumua`

### Cách A — Git clone (khuyến nghị)

```bash
sudo mkdir -p /opt/nhatkyvumua
sudo chown "$USER:$USER" /opt/nhatkyvumua
cd /opt/nhatkyvumua

git clone https://github.com/batagic/keep-house-clean.git repo
rsync -a repo/kho-thoc-api/ ./kho-thoc-api/
mkdir -p kho-thoc-api/data
```

### Cách B — Copy từ máy local (chỉ API)

Trên **VPS** (một lần — rsync **không** tự tạo thư mục cha):

```bash
mkdir -p /opt/nhatkyvumua/kho-thoc-api
```

Trên **máy Mac**:

```bash
rsync -avz --exclude node_modules --exclude .env \
  /Users/thao/DATA/Development/projects/NhatKyVuMua/keep-house-clean/kho-thoc-api/ \
  user@<IP_VPS>:/opt/nhatkyvumua/kho-thoc-api/
```

### Cách B2 — Copy cả repo (có `deploy/vps/` cho Nginx)

Trên **VPS** (bắt buộc trước khi rsync):

```bash
mkdir -p /opt/nhatkyvumua/repo
```

Trên **máy Mac**:

```bash
rsync -avz --exclude node_modules --exclude .env \
  /Users/thao/DATA/Development/projects/NhatKyVuMua/keep-house-clean/ \
  root@<IP_VPS>:/opt/nhatkyvumua/repo/
```

Sau đó trên **VPS**:

```bash
rsync -a /opt/nhatkyvumua/repo/kho-thoc-api/ /opt/nhatkyvumua/kho-thoc-api/ \
  --exclude node_modules --exclude .env
mkdir -p /opt/nhatkyvumua/kho-thoc-api/data
chmod +x /opt/nhatkyvumua/kho-thoc-api/scripts/*.sh
```

Cấu trúc sau bước này (Cách B2 có thêm `repo/`):

```text
/opt/nhatkyvumua/
├── repo/            ← mirror repo (nginx config, deploy docs) — chỉ Cách B2 / git clone
└── kho-thoc-api/
    ├── src/
    ├── scripts/
    ├── migrations/
    ├── data/          ← đặt profiles.csv, logs.csv
    ├── docker-compose.yml
    └── .env           ← tạo ở bước 4
```

---

## Bước 3 — Xác định Docker network

```bash
docker inspect eedt-postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
docker inspect eedt-nginx --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || true
```

Ghi tên network (ví dụ `docker_eedt-net`) — dùng cho `.env`.

---

## Bước 4 — Tạo user + database PostgreSQL (một lần)

```bash
cd /opt/nhatkyvumua/kho-thoc-api
chmod +x scripts/setup-db.sh scripts/verify-db.sh

# Sửa mật khẩu trong lệnh — KHÔNG dùng mật khẩu local
KHO_THOC_DB_PASSWORD='mat_khau_vps_manh' ./scripts/setup-db.sh
KHO_THOC_DB_PASSWORD='mat_khau_vps_manh' ./scripts/verify-db.sh
```

Phải thấy: `✅ kho_thoc bị chặn truy cập DB eedt`.

---

## Bước 5 — Tạo file `.env` production

```bash
cp /opt/nhatkyvumua/repo/deploy/vps/.env.production.example .env
# hoặc: cp .env.example .env
nano .env
```

Nội dung mẫu:

```env
PORT=3001
BASE_PATH=/kho-thoc
DATABASE_URL=postgresql://kho_thoc:mat_khau_vps_manh@eedt-postgres:5432/kho_thoc
CORS_ORIGINS=https://batagic.github.io
EEDT_DOCKER_NETWORK=docker_eedt-net
```

> `CORS_ORIGINS` **bắt buộc** có `https://batagic.github.io` — không có trailing slash.

---

## Bước 6 — Chạy API Docker

```bash
cd /opt/nhatkyvumua/kho-thoc-api
docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js
docker compose ps
docker stats --no-stream
```

Test **trên VPS** (chưa cần HTTPS):

```bash
curl -s 'http://127.0.0.1:3001/kho-thoc/?type=ping'
# → {"result":"ok","ts":...}
```

---

## Bước 7 — Import dữ liệu Sheets (nếu có)

Upload CSV lên `kho-thoc-api/data/`, rồi:

```bash
docker compose exec kho-thoc-api node scripts/import-csv.js \
  --profiles ./data/profiles.csv \
  --logs ./data/logs.csv

curl -s 'http://127.0.0.1:3001/kho-thoc/?type=profiles'
```

---

## Bước 8 — SSL + Nginx (khuyến nghị: Host Nginx)

`eedt-nginx` chỉ map **8082→80** (HTTP) — **không** có `:443`.  
→ SSL cho `apinhatkyvumua.taho.cat` nên cấu hình trên **Host Nginx** (Ubuntu), proxy thẳng `kho-thoc-api` cổng **3001**.

Giải thích: [SSL-GIAI-THICH.md](./SSL-GIAI-THICH.md)

### 8.1 Kiểm tra Host Nginx

```bash
sudo systemctl status nginx
sudo ss -tlnp | grep ':443'
```

### 8.2 DNS

Panel Hostinger (hoặc nơi quản lý `taho.cat`) → **A record**:

| Type | Name | Value |
|------|------|-------|
| A | `apinhatkyvumua` | `<IP_VPS>` (vd. `64.176.85.165`) |

Kiểm tra từ Mac (dùng resolver công cộng, tránh cache local):

```bash
dig +short apinhatkyvumua.taho.cat @8.8.8.8
dig +short apinhatkyvumua.taho.cat
```

Kỳ vọng: trả về IP VPS. Nếu `@8.8.8.8` có IP nhưng lệnh không có `@` trống → xóa cache Mac:

```bash
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

Chờ 5–15 phút sau khi thêm record mới.

### 8.3 Site HTTP tạm (certbot cần port 80)

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

Test proxy HTTP (từ Mac hoặc VPS):

```bash
curl -s 'http://apinhatkyvumua.taho.cat/kho-thoc/?type=ping'
```

### 8.4 Chứng chỉ SSL (Let's Encrypt)

```bash
certbot --nginx -d apinhatkyvumua.taho.cat
```

Chọn **redirect HTTP → HTTPS** khi được hỏi.

### 8.5 Config HTTPS đầy đủ từ repo

Sau khi cert OK, thay bằng config có SSL + proxy (không redirect 301 nội bộ):

```bash
cp /opt/nhatkyvumua/repo/deploy/vps/nginx/apinhatkyvumua.taho.cat.conf \
   /etc/nginx/sites-available/apinhatkyvumua.taho.cat
nginx -t && systemctl reload nginx
```

Kiểm tra **cả hai** URL đều 200 (không 301):

```bash
curl -sI 'https://apinhatkyvumua.taho.cat/kho-thoc?type=ping' | head -1
curl -sI 'https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping' | head -1
```

`kho-thoc-api` phải đang chạy và listen `0.0.0.0:3001` (mặc định `docker compose`).

### Phương án B (ít dùng): chỉ qua `eedt-nginx`

Chỉ khi Host Nginx đã proxy `https://...taho.cat` → `:8082` và bạn muốn API đi chung cổng đó — thêm snippet  
`deploy/vps/nginx/eedt-nginx-kho-thoc-snippet.conf` vào config trong container `eedt-nginx`.

---

## Bước 9 — Kiểm tra HTTPS từ bên ngoài

Trên máy local (không phải VPS):

```bash
curl -s 'https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping'
curl -s 'https://apinhatkyvumua.taho.cat/kho-thoc/?type=profiles'
```

Phải trả JSON, không lỗi SSL.

Kiểm tra CORS (mô phỏng GitHub Pages):

```bash
curl -s -H 'Origin: https://batagic.github.io' \
  'https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping' -v 2>&1 | grep -i access-control
```

Kỳ vọng header `Access-Control-Allow-Origin: https://batagic.github.io`.

---

## Bước 10 — Cutover `API_URL` trên GitHub

Trên **máy dev**, sửa `assets/js/data/config.js`:

```javascript
/** Production — GitHub Pages gọi VPS (trailing / bắt buộc) */
const API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc/';

/** Rollback GAS:
const API_URL = 'https://script.google.com/macros/s/.../exec';
*/

/** Local dev:
const API_URL = 'http://localhost:3001';
*/
```

Commit + push:

```bash
git add assets/js/data/config.js
git commit -m "Cutover API_URL sang VPS production"
git push
```

Đợi GitHub Pages cập nhật (~1–2 phút).

---

## Bước 11 — Kiểm tra end-to-end

1. Mở **ẩn danh**: `https://batagic.github.io/keep-house-clean/nhat-ky.html`
2. DevTools → **Network** → filter `kho-thoc` hoặc domain API
3. Xác nhận request tới `https://apinhatkyvumua.taho.cat/kho-thoc/?type=profiles`
4. Thử thêm bé / ghi nhật ký → kiểm tra Postgres:

```bash
docker exec -e PGPASSWORD='...' eedt-postgres \
  psql -U kho_thoc -d kho_thoc -c 'SELECT id, name, total_grain FROM profiles;'
```

---

## Rollback

Đổi `API_URL` về Apps Script trong `config.js` → push. Sheets vẫn nguyên.

---

## Xử lý lỗi

| Triệu chứng | Nguyên nhân | Cách sửa |
|-------------|-------------|----------|
| `rsync: mkdir failed: No such file or directory` | Thư mục đích chưa tồn tại trên VPS | SSH vào VPS: `mkdir -p /opt/nhatkyvumua/repo` (hoặc `kho-thoc-api`) **trước** khi rsync |
| `dig +short` không ra gì | Chưa có A record hoặc cache DNS Mac | Thêm A record trên Hostinger; thử `dig @8.8.8.8`; flush cache Mac |
| Network tab **301** trên `/kho-thoc?type=...` | `API_URL` thiếu `/` cuối hoặc Nginx redirect | `API_URL` phải là `.../kho-thoc/`; Nginx dùng `location /kho-thoc { proxy_pass http://127.0.0.1:3001; }` — **không** `return 301` |
| Mixed content | API chưa HTTPS | Hoàn thành bước 8–9 |
| CORS error | Thiếu origin | `CORS_ORIGINS=https://batagic.github.io` trong `.env`, restart API |
| 502 Bad Gateway | Nginx không thấy container | `docker ps`; kiểm tra API listen `:3001` |
| 404 trên `/kho-thoc/` | Sai `BASE_PATH` | `.env` phải có `BASE_PATH=/kho-thoc` |
| API_URL vẫn localhost | Chưa push config | Push `config.js`, hard refresh `Cmd+Shift+R` |

---

## Bảo trì

```bash
# Cập nhật code API
cd /opt/nhatkyvumua && git -C repo pull
rsync -a repo/kho-thoc-api/ kho-thoc-api/ --exclude .env --exclude data
cd kho-thoc-api && docker compose up -d --build

# Backup DB hàng ngày
docker exec eedt-postgres pg_dump -U kho_thoc kho_thoc > /opt/nhatkyvumua/backup_$(date +%F).sql
```

---

## Checklist nhanh

- [ ] `/opt/nhatkyvumua/kho-thoc-api` có code
- [ ] `setup-db.sh` + `verify-db.sh` OK
- [ ] `.env` production (`BASE_PATH=/kho-thoc`, CORS GitHub)
- [ ] `docker compose up` + migrate
- [ ] Import CSV (nếu cần)
- [ ] Nginx + SSL → `curl https://api.../kho-thoc/?type=ping`
- [ ] `config.js` → push GitHub Pages
- [ ] Test `nhat-ky.html` ẩn danh — Network **200** (URL `.../kho-thoc/?type=...`, không 301)
