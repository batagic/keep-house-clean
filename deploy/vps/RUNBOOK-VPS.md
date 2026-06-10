# Runbook deploy VPS — apinhatkyvumua.taho.cat

**Xác nhận:** SSL terminate ở **Host Nginx** (`:443` active, cert Let's Encrypt có sẵn cho `*.taho.cat`).

Chạy lần lượt trên VPS (`root@vultr`). Thay `MAT_KHAU_DB` bằng mật khẩu thật.

---

## 0. DNS (nếu chưa làm)

Panel DNS → **A record**:

```text
apinhatkyvumua.taho.cat  →  <IP_VPS>
```

Kiểm tra:

```bash
dig +short apinhatkyvumua.taho.cat
```

---

## 1. Thư mục + code

### Cách A — Git clone (trên VPS)

```bash
mkdir -p /opt/nhatkyvumua
cd /opt/nhatkyvumua

git clone https://github.com/batagic/keep-house-clean.git repo

rsync -a repo/kho-thoc-api/ ./kho-thoc-api/ \
  --exclude node_modules --exclude .env

mkdir -p kho-thoc-api/data
chmod +x kho-thoc-api/scripts/*.sh
```

### Cách B — rsync từ Mac (code chưa push GitHub)

Trên **VPS** trước (rsync không tự tạo thư mục cha):

```bash
mkdir -p /opt/nhatkyvumua/repo
```

Trên **Mac**:

```bash
rsync -avz --exclude node_modules --exclude .env \
  /Users/thao/DATA/Development/projects/NhatKyVuMua/keep-house-clean/ \
  root@<IP_VPS>:/opt/nhatkyvumua/repo/
```

Tiếp trên **VPS**:

```bash
cd /opt/nhatkyvumua
rsync -a repo/kho-thoc-api/ ./kho-thoc-api/ \
  --exclude node_modules --exclude .env
mkdir -p kho-thoc-api/data
chmod +x kho-thoc-api/scripts/*.sh
```

---

## 2. Docker network (ghi lại tên)

```bash
docker inspect eedt-postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

Ví dụ ra `docker_eedt-net` — dùng ở bước 4.

---

## 3. Database PostgreSQL

```bash
cd /opt/nhatkyvumua/kho-thoc-api

export KHO_THOC_DB_PASSWORD='MAT_KHAU_DB'
./scripts/setup-db.sh
./scripts/verify-db.sh
```

Phải thấy: `✅ kho_thoc bị chặn truy cập DB eedt`.

---

## 4. File `.env`

```bash
cat > /opt/nhatkyvumua/kho-thoc-api/.env << 'EOF'
PORT=3001
BASE_PATH=/kho-thoc
DATABASE_URL=postgresql://kho_thoc:MAT_KHAU_DB@eedt-postgres:5432/kho_thoc
CORS_ORIGINS=https://batagic.github.io
EEDT_DOCKER_NETWORK=docker_eedt-net
EOF

# Sửa MAT_KHAU_DB thật:
nano /opt/nhatkyvumua/kho-thoc-api/.env
```

> Đổi `EEDT_DOCKER_NETWORK` nếu bước 2 khác `docker_eedt-net`.

---

## 5. Chạy API Docker

```bash
cd /opt/nhatkyvumua/kho-thoc-api
docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js

curl -s 'http://127.0.0.1:3001/kho-thoc/?type=ping'
```

Kỳ vọng: `{"result":"ok",...}`

---

## 6. Import dữ liệu (nếu có CSV)

Upload `profiles.csv` + `logs.csv` vào `/opt/nhatkyvumua/kho-thoc-api/data/` (scp từ Mac), rồi:

```bash
docker compose exec kho-thoc-api node scripts/import-csv.js \
  --profiles ./data/profiles.csv \
  --logs ./data/logs.csv
```

---

## 7. Host Nginx + SSL

Subdomain `apinhatkyvumua.taho.cat` **chưa có** trong `/etc/letsencrypt/live/` — tạo cert trước.

**7a. Site HTTP tạm** (certbot cần port 80):

```bash
cat > /etc/nginx/sites-available/apinhatkyvumua.taho.cat << 'EOF'
server {
    listen 80;
    server_name apinhatkyvumua.taho.cat;

    location /kho-thoc/ {
        proxy_pass http://127.0.0.1:3001/kho-thoc/;
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

**7b. Cert Let's Encrypt** (certbot tự thêm block HTTPS):

```bash
certbot --nginx -d apinhatkyvumua.taho.cat
```

Chọn redirect HTTP → HTTPS khi được hỏi.

**7c. (Tùy chọn)** Thay bằng config đầy đủ từ repo sau khi cert OK:

```bash
cp /opt/nhatkyvumua/repo/deploy/vps/nginx/apinhatkyvumua.taho.cat.conf \
   /etc/nginx/sites-available/apinhatkyvumua.taho.cat
nginx -t && systemctl reload nginx
```

---

## 8. Test HTTPS (từ VPS hoặc Mac)

```bash
curl -s 'https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping'
curl -s -H 'Origin: https://batagic.github.io' \
  'https://apinhatkyvumua.taho.cat/kho-thoc/?type=profiles'
```

---

## 9. Cutover GitHub Pages (trên máy dev)

Sửa `assets/js/data/config.js`:

```javascript
const API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc';
```

```bash
git add assets/js/data/config.js
git commit -m "Cutover API to apinhatkyvumua.taho.cat"
git push
```

Đợi 1–2 phút → mở ẩn danh:  
`https://batagic.github.io/keep-house-clean/nhat-ky.html`

---

## 10. Kiểm tra RAM

```bash
free -h
docker stats --no-stream
```

---

## Lệnh hữu ích sau này

```bash
# Log API
docker logs -f kho-thoc-api

# Cập nhật code
cd /opt/nhatkyvumua && git -C repo pull
rsync -a repo/kho-thoc-api/ kho-thoc-api/ --exclude .env --exclude data
cd kho-thoc-api && docker compose up -d --build

# Backup DB
docker exec eedt-postgres pg_dump -U kho_thoc kho_thoc > /opt/nhatkyvumua/backup_$(date +%F).sql
```
