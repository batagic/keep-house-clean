# Coding Convention — Kho Thóc

## Cấu trúc repo

- `code/` — mã nguồn chạy được (frontend, API, deploy)
- `docs/` — tài liệu; SQL mirror tại `docs/db/migrate/` (sync từ API)

## JavaScript

- Frontend: ES modules không bundler; file theo trang trong `code/assets/js/pages/`
- API: CommonJS Node.js; routes mỏng, logic trong `src/services/`
- Đặt tên: `camelCase` biến/hàm; `UPPER_SNAKE` hằng config

## SQL

- Migration **tạo mới** tại `code/kho-thoc-api/migrations/NNN_mo_ta.sql` (số thứ tự tăng)
- Chạy: `npm run migrate` (hoặc `node scripts/migrate.js` trong container)
- Sau khi thêm migrate: `bash code/kho-thoc-api/scripts/sync-migrations.sh` → cập nhật `docs/db/migrate/`
- Xem [`docs/db/README.md`](../db/README.md)

## Test

- Domain test: `tests/domain/<domain>/`
- Dùng `tests/common.sh` — biến `CODE_ROOT`, `DOCS_DB`
- Cập nhật `tests/test-case.md` khi thêm case

## Commit

- Message ngắn, tập trung *why*
- Không commit `.env`, `account.txt`, `node_modules/`

## Deploy

- Không push/deploy khi chưa được người dùng xác nhận
- Lệnh deploy: `./ops/vps/deploy.sh --all`
