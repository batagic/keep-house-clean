# Vận hành — Kho Thóc

Deploy tính năng mới, SSL, xử lý sự cố, backup.  
**Cài đặt lần đầu** (macOS + VPS) → [installation.md](./installation.md).

**Trạng thái:** API VPS `64.176.85.165` · HTTPS `apinhatkyvumua.taho.cat` · Frontend GitHub Pages.

---

## Kiến trúc deploy

```
Mac dev  →  git push main
              ├─→ GitHub Pages (HTML/JS/CSS) — tự deploy ~1–2 phút
              └─→ VPS: git pull + rsync + docker build (API)
```

| Thành phần | Host | Cập nhật |
|------------|------|----------|
| `code/nhat-ky.html`, `code/assets/` | GitHub Pages | `git push` |
| `code/kho-thoc-api/src/`, `docs/db/migrate/` | VPS Docker | `./code/deploy/vps/deploy.sh` |
| `.env` | Chỉ VPS | Sửa tay — không commit |
| Nginx / SSL | Host VPS | Khi đổi domain/path |

> Chỉ deploy VPS mà quên `git push` → UI cũ. Chỉ `docker compose restart` → API cũ (image copy `src/` lúc build).

---

## Deploy tính năng mới

**Dùng khi:** VPS + GitHub Pages **đã chạy**.

### Xác định loại thay đổi

| Loại | File | VPS | GitHub Pages |
|------|------|:---:|:------------:|
| **A** Chỉ UI | `nhat-ky.html`, `assets/js/pages/*.js` | — | **Có** |
| **B** Chỉ API | `code/kho-thoc-api/src/` | **Có** | — |
| **C** API + DB | `docs/db/migrate/` | **Có** + migrate | Tùy |
| **D** Full-stack | Cả hai | **Có** | **Có** |
| **E** Env mới | `.env` trên VPS | Sửa + rebuild | — |

### Quy trình

**0. Mac — test + push**

```bash
cd kho-thoc-api && npm run dev   # curl http://127.0.0.1:3001/?type=ping
git add <files> && git commit -m "feat: ..." && git push origin main
```

**1. VPS — cập nhật code**

```bash
cd /opt/nhatkyvumua
git -C repo pull origin main
rsync -a repo/code/kho-thoc-api/ kho-thoc-api/ \
  --exclude .env --exclude data --exclude node_modules
grep -n <tu_khoa_tinh_nang> kho-thoc-api/src/   # xác nhận code mới
```

**2. Rebuild Docker** (bắt buộc khi đổi API)

```bash
cd /opt/nhatkyvumua/kho-thoc-api
docker compose up -d --build --force-recreate
docker compose exec kho-thoc-api grep -n <tu_khoa> /app/src/...   # khớp đĩa
```

**3. Migration** (nếu có SQL mới)

```bash
docker compose exec kho-thoc-api node scripts/migrate.js
```

**4. Env** (nếu cần)

```bash
nano /opt/nhatkyvumua/kho-thoc-api/.env
docker compose up -d --build
```

**5. Test API**

```bash
curl -s 'http://127.0.0.1:3001/kho-thoc/?type=ping'
curl -s -X POST 'http://127.0.0.1:3001/kho-thoc/' \
  -H 'Content-Type: application/json' \
  -d '{"type":"profile","id":"p_debug_'$(date +%s)'","name":"Test","avatar":"👶"}'
```

**6. Frontend** — đã push ở bước 0; đợi GitHub Pages; test **cửa sổ ẩn danh**.

### Checklist

```
[ ] Mac: commit + push main
[ ] VPS: git pull + rsync
[ ] VPS: grep xác nhận code trên đĩa
[ ] VPS: docker compose up -d --build --force-recreate
[ ] VPS: grep xác nhận code TRONG container
[ ] VPS: migrate.js (nếu có)
[ ] VPS: curl test API
[ ] Browser ẩn danh: end-to-end OK
```

### Nâng cấp Phase 3.1 — Phiên gia đình

1. Deploy API có `POST type=unlock_family` + rate limit.
2. Push frontend: `family-api.js` (session), modal tầng 1 trên `nhat-ky.html`.
3. Kiểm tra: trình duyệt ẩn danh → nhập passcode bé → thấy đúng danh sách con.
4. Kiểm tra: đổi quà vẫn hỏi passcode lần 2; ghi nhiệm vụ không hỏi thêm.

Spec: [family-session.md](../brd/family-session.md).

### Nâng cấp Phase 1 → Phase 2

1. Backup DB (`pg_dump` — xem § Backup).
2. Pull/rsync + thêm `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS` vào `.env`.
3. `docker compose up -d --build` + `migrate.js` (`002`, `003`).
4. `npm run seed:admin`.
5. Push frontend (`admin/`, modal passcode).
6. Admin **Sinh mã mới** cho bé import CSV cũ.

---

## SSL terminate

**SSL terminate** = nơi giải mã HTTPS (cert Let's Encrypt) trước khi proxy vào Docker.

```
Trình duyệt ──HTTPS──► Host Nginx :443
                              ├── HTTP → :8082 → eedt-nginx
                              └── HTTP → :3001 → kho-thoc-api
```

`eedt-nginx` chỉ map `8082→80` — **không** có `:443`. SSL cho `apinhatkyvumua.taho.cat` cấu hình trên **Host Nginx**.

Kiểm tra VPS:

```bash
sudo systemctl status nginx
sudo ss -tlnp | grep ':443'
sudo ls /etc/letsencrypt/live/
```

**CORS + trailing slash:** `API_URL = '.../kho-thoc/'` (có `/` cuối). Nginx: `location /kho-thoc { proxy_pass http://127.0.0.1:3001; }` — **không** `return 301`.

---

## Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách sửa |
|-------------|-------------|----------|
| API thiếu field mới | Container code cũ | `--build --force-recreate`; `grep` đĩa vs container |
| `grep` VPS không ra code mới | Chưa pull/rsync | `git pull` + `rsync` |
| UI không đổi | Chưa push frontend | `git push`; test ẩn danh |
| Network **301** | `API_URL` thiếu `/` cuối | `.../kho-thoc/`; Nginx config repo |
| CORS error | Thiếu origin | `CORS_ORIGINS=https://batagic.github.io` + rebuild |
| 502 Bad Gateway | API không chạy | `docker ps`; log `docker logs kho-thoc-api` |
| 404 `/kho-thoc/` | Sai `BASE_PATH` | `.env`: `BASE_PATH=/kho-thoc` |
| Mixed content | API chưa HTTPS | Hoàn thành SSL |
| Migration lỗi | Schema cũ | `docker logs kho-thoc-api`; chạy lại `migrate.js` |
| `docker compose restart` không đủ | Image cũ | Phải `up -d --build` |
| rsync `mkdir failed` | Thư mục VPS chưa có | `mkdir -p /opt/nhatkyvumua/repo` |
| `dig` trống | DNS | A record; `dig @8.8.8.8`; flush DNS Mac |

---

## Rollback

| Mức | Cách |
|-----|------|
| **Khẩn cấp frontend** | `API_URL` về GAS trong `config.js` → push |
| **Frontend** | `git revert` → push |
| **API** | `git -C repo checkout <commit>` → rsync → `--build` |

---

## Backup & lệnh hữu ích

```bash
# Backup DB hàng ngày
docker exec eedt-postgres pg_dump -U kho_thoc kho_thoc > /opt/nhatkyvumua/backup_$(date +%F).sql

# Log API
docker logs -f kho-thoc-api

# Test HTTPS + CORS từ Mac
curl -s 'https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping'
curl -s -H 'Origin: https://batagic.github.io' \
  'https://apinhatkyvumua.taho.cat/kho-thoc/?type=profiles'
```

---

## Trạng thái dự án (cập nhật 10/06/2026)

| Hạng mục | Trạng thái |
|----------|------------|
| API `kho-thoc-api` local + VPS | ✅ |
| HTTPS `apinhatkyvumua.taho.cat` | ✅ |
| Cutover `API_URL` GitHub Pages | ⏳ trailing `/` |
| Phase 2 passcode + admin | ✅ |
| Phase 3.1 phiên gia đình | ✅ |
| Phase 3 multi-tenant | ❌ |
| Import CSV VPS | ⏳ |
| Cron `pg_dump` | ❌ |

**URL production:**

- Frontend: `https://batagic.github.io/keep-house-clean/nhat-ky.html`
- API: `https://apinhatkyvumua.taho.cat/kho-thoc/`
- Admin: `https://batagic.github.io/keep-house-clean/admin/login.html`

---

## Tham chiếu

| Tài liệu | Mục đích |
|----------|----------|
| [installation.md](./installation.md) | Cài đặt lần đầu |
| [specs/passcode.md](./specs/passcode.md) | Spec passcode đổi quà |
| [specs/admin.md](./specs/admin.md) | Spec trang admin |
| [tech/migration-vps.md](./tech/migration-vps.md) | Lộ trình migrate |
| `code/deploy/vps/nginx/` | Config Nginx |
