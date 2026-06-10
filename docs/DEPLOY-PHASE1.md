# Triển khai Phase 1 — VPS thay Google Apps Script

**Trạng thái:** API sẵn sàng trong `kho-thoc-api/` — chờ deploy lên VPS và cutover `API_URL`.

---

## Checklist

- [x] Schema SQL (`kho-thoc-api/migrations/001_init.sql`)
- [x] API Node.js map contract GAS (`kho-thoc-api/src/`)
- [x] Docker compose (API only — dùng `eedt-postgres` sẵn có)
- [x] Script import CSV từ Sheets
- [x] Frontend hỗ trợ cả GAS và VPS (`API_USE_PLAIN_TEXT`)
- [ ] Tạo DB `kho_thoc` trên `eedt-postgres` (VPS)
- [ ] Deploy container `kho-thoc-api`
- [ ] Nginx HTTPS → `:3001/kho-thoc`
- [ ] Import dữ liệu Sheets hiện tại
- [ ] Đổi `API_URL` trong `assets/js/data/config.js`
- [ ] Kiểm tra `docker stats` / `free -h` sau deploy
- [ ] Thiết lập `pg_dump` cron backup

---

## Thứ tự triển khai trên VPS

1. **Kiểm tra RAM** — `free -h` và `docker stats` (mục tiêu còn ≥200 MB headroom).
2. **Tạo database** — xem [kho-thoc-api/README.md](../kho-thoc-api/README.md).
3. **Tạo DB** — `docker exec -i eedt-postgres psql -U eedt < scripts/init-db.sql`.
4. **Clone / copy** thư mục `kho-thoc-api` lên VPS, `cp .env.example .env` (`BASE_PATH=/kho-thoc`, host `eedt-postgres`).
5. **Docker** — `docker compose up -d --build`.
6. **Migrate** — `docker compose exec kho-thoc-api node scripts/migrate.js`.
7. **Import CSV** — export Profiles + Logs từ Google Sheets.
8. **Nginx** — route `/kho-thoc/` (snippet trong README API).
9. **Smoke test** — `curl https://api.<domain>/kho-thoc/?type=ping`.
10. **Cutover** — sửa `API_URL`, push GitHub Pages.
11. **Giữ Sheets read-only** 1 tháng làm backup.

---

## Rollback

Nếu VPS có vấn đề, đổi lại `API_URL` về Apps Script trong `config.js` và push — frontend quay về GAS ngay.

---

## Tham chiếu

- [kehoach.md](./kehoach.md) — đánh giá & lộ trình
- [architech.md](./architech.md) — sơ đồ hạ tầng VPS
- [kho-thoc-api/README.md](../kho-thoc-api/README.md) — hướng dẫn API chi tiết
