# Triển khai Phase 1 — VPS thay Google Apps Script

**Trạng thái:** API đã deploy lên VPS `64.176.85.165` · HTTPS `apinhatkyvumua.taho.cat` OK.

---

## Checklist

- [x] Schema SQL (`kho-thoc-api/migrations/001_init.sql`)
- [x] API Node.js map contract GAS (`kho-thoc-api/src/`)
- [x] Docker compose (API only — dùng `eedt-postgres` sẵn có)
- [x] Script import CSV từ Sheets
- [x] Frontend hỗ trợ cả GAS và VPS (`API_USE_PLAIN_TEXT`)
- [x] Tạo DB `kho_thoc` trên `eedt-postgres` (VPS)
- [x] Deploy container `kho-thoc-api`
- [x] Nginx HTTPS → `:3001/kho-thoc`
- [ ] Import dữ liệu Sheets hiện tại (VPS)
- [x] Đổi `API_URL` trong `assets/js/data/config.js` (`.../kho-thoc/` — có `/` cuối)
- [ ] Kiểm tra end-to-end GitHub Pages (Network status 200)
- [ ] Thiết lập `pg_dump` cron backup

---

## Tài liệu deploy (dùng lần sau)

| File | Khi nào dùng |
|------|----------------|
| **[deploy/vps/RUNBOOK-VPS.md](../deploy/vps/RUNBOOK-VPS.md)** | Lệnh copy-paste từng bước |
| **[deploy/vps/HUONG-DAN-DEPLOY-VPS.md](../deploy/vps/HUONG-DAN-DEPLOY-VPS.md)** | Giải thích chi tiết + bảng xử lý lỗi |
| **[deploy/vps/SSL-GIAI-THICH.md](../deploy/vps/SSL-GIAI-THICH.md)** | SSL host vs container |
| **[snapshot.md](./snapshot.md)** | Trạng thái hiện tại + bài học deploy |

---

## Thứ tự triển khai (tóm tắt)

1. **DNS** — A record `apinhatkyvumua` → IP VPS; `dig @8.8.8.8`
2. **Code** — `git clone` hoặc `rsync` → `/opt/nhatkyvumua` (nhớ `mkdir` trước rsync)
3. **Database** — `setup-db.sh` + `verify-db.sh`
4. **`.env`** — `BASE_PATH=/kho-thoc`, `CORS_ORIGINS=https://batagic.github.io`
5. **Docker** — `docker compose up -d --build` + `migrate.js`
6. **Import CSV** — nếu cần
7. **Nginx HTTP** → **certbot** → copy config từ `deploy/vps/nginx/apinhatkyvumua.taho.cat.conf`
8. **Test** — `curl https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping`
9. **Cutover** — `API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc/'` → push
10. **Verify** — ẩn danh, DevTools Network status **200** (không 301)

---

## Lưu ý quan trọng

### `API_URL` phải có trailing slash

```javascript
const API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc/';
```

Frontend ghép `${API_URL}?type=profiles`. Thiếu `/` cuối → URL `/kho-thoc?type=...` → Nginx **301** → `fetch` từ GitHub Pages bị chặn.

### Nginx không redirect 301 nội bộ

Dùng `location /kho-thoc { proxy_pass http://127.0.0.1:3001; }` — xem file config trong repo.

### rsync cần thư mục sẵn trên VPS

```bash
mkdir -p /opt/nhatkyvumua/repo   # trên VPS, trước khi rsync từ Mac
```

---

## Rollback

Đổi lại `API_URL` về Apps Script trong `config.js` và push — frontend quay về GAS ngay.

---

## Tham chiếu

- [kehoach.md](./kehoach.md) — đánh giá & lộ trình
- [HUONG-DAN-CAI-DAT.md](./HUONG-DAN-CAI-DAT.md) — cài đặt local + VPS
- [kho-thoc-api/README.md](../kho-thoc-api/README.md) — hướng dẫn API chi tiết
