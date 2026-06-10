# kho-thoc-api

API Node.js thay Google Apps Script — **Phase 1** (1 gia đình, không auth).

Dùng **Postgres sẵn có** (`eedt-postgres`) — không tạo container Postgres mới.

Contract tương thích `docs/tech/legacy/apps-script-v11.md`:

| Method | Query / Body | Response |
|--------|----------------|----------|
| GET | `?type=ping` | `{ result, ts }` |
| GET | `?type=profiles` | `{ profiles }` |
| GET | `?type=logs&profileId&limit&offset` | `{ logs, total, hasMore }` |
| GET | *(mặc định)* | `{ profiles, logs, total }` |
| POST | `{ type: log \| delete_log \| profile, ... }` | `{ result, action? }` |

---

> **Cài đặt:** [docs/installation.md](../docs/installation.md) · **Vận hành:** [docs/operations.md](../docs/operations.md)

## 1. Tạo user + database riêng (một lần / mỗi máy)

User `kho_thoc` và DB `kho_thoc` **tách biệt hoàn toàn** khỏi `eedt` — chỉ dùng chung container `eedt-postgres`.

```bash
chmod +x scripts/setup-db.sh scripts/verify-db.sh
KHO_THOC_DB_PASSWORD='mat_khau_manh' ./scripts/setup-db.sh
KHO_THOC_DB_PASSWORD='mat_khau_manh' ./scripts/verify-db.sh
```

---

## 2. Cấu hình `.env`

```bash
cp .env.example .env
```

| Cách chạy API | `DATABASE_URL` host |
|---------------|---------------------|
| `docker compose up` | `eedt-postgres` |
| `npm run dev` trên máy | `localhost` |

Ví dụ Docker:

```
DATABASE_URL=postgresql://kho_thoc:your_password@eedt-postgres:5432/kho_thoc
BASE_PATH=
PORT=3001
```

VPS production: đặt `BASE_PATH=/kho-thoc`.

---

## 3. Chạy local

### Cách A — Docker (khuyến nghị, giống VPS)

```bash
cd kho-thoc-api
docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js
```

API: `http://localhost:3001/?type=ping`

Container `kho-thoc-api` phải cùng Docker network với `eedt-postgres`. Kiểm tra và đặt trong `.env`:

```bash
docker inspect eedt-postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
# → ví dụ: docker_eedt-net

# .env
EEDT_DOCKER_NETWORK=docker_eedt-net
```

### Cách B — Node trực tiếp trên máy

`eedt-postgres` đang map `0.0.0.0:5432` → dùng `localhost` trong `.env`:

```bash
npm install
npm run migrate
npm run dev
```

---

## 4. Test nhanh

```bash
curl -s 'http://localhost:3001/?type=ping'
curl -s 'http://localhost:3001/?type=profiles'

curl -s -X POST 'http://localhost:3001/' \
  -H 'Content-Type: application/json' \
  -d '{"type":"profile","id":"p_test","name":"Bé Test","avatar":"👶"}'
```

---

## 5. Import dữ liệu từ Google Sheets

Export sheet `Profiles` và `Logs` ra CSV, đặt vào `kho-thoc-api/data/`:

```bash
# Trong container (thư mục data/ được mount vào /app/data)
docker compose exec kho-thoc-api node scripts/import-csv.js \
  --profiles ./data/profiles.csv --logs ./data/logs.csv

# Hoặc trên máy host (cần .env với localhost)
npm run import:csv -- --profiles ./data/profiles.csv --logs ./data/logs.csv
```

---

## 6. Deploy VPS

Giống local — cùng `eedt-postgres`, cùng `docker-compose.yml`:

```bash
cp .env.example .env
# DATABASE_URL host = eedt-postgres
# BASE_PATH=/kho-thoc

docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js
docker stats   # kiểm tra RAM
```

### Nginx (HTTPS — bắt buộc cho GitHub Pages)

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

Cutover frontend — `assets/js/data/config.js`:

```javascript
const API_URL = 'https://api.<domain>/kho-thoc';
```

---

## Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `PORT` | `3001` | Port HTTP |
| `BASE_PATH` | `''` | Prefix route; VPS: `/kho-thoc` |
| `DATABASE_URL` | — | `eedt-postgres` (Docker) hoặc `localhost` (host) |
| `CORS_ORIGINS` | — | Origin được phép, phân tách `,` |

---

## Backup

```bash
docker exec eedt-postgres pg_dump -U kho_thoc kho_thoc > backup_kho_thoc_$(date +%F).sql
```
