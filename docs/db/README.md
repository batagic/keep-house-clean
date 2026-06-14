# Database — migrations & seed

Dự án dùng **SQL thuần** + `node scripts/migrate.js` (không Knex). Có **hai thư mục** — vai trò khác nhau.

## Hai thư mục — chạy từ đâu?

| Thư mục | Vai trò | Ai dùng |
|---------|---------|---------|
| [`code/kho-thoc-api/migrations/`](../code/kho-thoc-api/migrations/) | **Nguồn chạy** — `migrate.js` đọc trực tiếp; Docker/VPS deploy mang theo khi rsync API | Developer, CI, container |
| [`docs/db/migrate/`](./migrate/) | **Bản sao + tham chiếu operator** — SQL thuần, xem/chạy tay bằng `psql` không cần Node | Operator, tài liệu, audit lịch sử |

**Quy tắc vàng:** thêm/sửa migration → tạo file trong `code/kho-thoc-api/migrations/NNN_mo_ta.sql` → chạy migrate → đồng bộ sang docs:

```bash
bash code/kho-thoc-api/scripts/sync-migrations.sh
```

Nếu quên bước sync, operator dựng VPS mới từ `docs/db/migrate/` sẽ **thiếu schema** so với code đang chạy.

## Tình huống 1 — Developer thêm cột / bảng

1. Tạo `code/kho-thoc-api/migrations/005_ten_mo_ta.sql` (số thứ tự tăng, SQL thuần).
2. Chạy migrate (local hoặc container):

   ```bash
   cd code/kho-thoc-api
   npm run migrate
   # hoặc: docker compose exec kho-thoc-api node scripts/migrate.js
   ```

3. `bash scripts/sync-migrations.sh` — copy sang `docs/db/migrate/`.
4. Commit **cả hai** thư mục trong cùng một PR/commit.

`migrate.js` ghi nhận file đã chạy trong bảng `schema_migrations` — không chạy lại file cũ.

## Tình huống 2 — Operator dựng DB sạch trên VPS

Không bắt buộc hiểu Node/npm. Có hai cách:

**Cách A — SQL thuần (khuyến nghị khi chỉ có `psql`):**

```bash
cd /opt/nhatkyvumua/repo/docs/db/migrate
for f in *.sql; do psql "$DATABASE_URL" -f "$f"; done
```

**Cách B — qua container API (đã có Docker):**

```bash
docker compose exec kho-thoc-api node scripts/migrate.js
```

Container đọc từ `code/kho-thoc-api/migrations/` (đã rsync khi deploy).

Sau schema: seed tùy môi trường — [`seed-dev.sql`](./seed-dev.sql), [`seed-prod.sql`](./seed-prod.sql).

## Rủi ro mất đồng bộ

Developer thêm `005_…sql` trong `code/…/migrations/` nhưng không chạy `sync-migrations.sh` → `docs/db/migrate/` lỗi thời → operator bootstrap thiếu cột → API crash.

**Checklist trước merge:** file mới có trong cả `code/kho-thoc-api/migrations/` và `docs/db/migrate/` (nội dung giống nhau).

## File seed

| File | Mục đích |
|------|----------|
| `seed-dev.sql` | Tạo DB `kho_thoc` local |
| `seed-prod.sql` | Ghi chú / dữ liệu prod (không chạy tự động) |
| `seed-lan-phuong.sql` | Seed gia đình cụ thể (thủ công) |

## Tham chiếu

- Chạy migrate: [`code/kho-thoc-api/scripts/migrate.js`](../code/kho-thoc-api/scripts/migrate.js)
- Đồng bộ code → docs: [`sync-migrations.sh`](../code/kho-thoc-api/scripts/sync-migrations.sh)
- Deploy VPS: [`docs/technical/prod.md`](../technical/prod.md)
