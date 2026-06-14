# Coding Convention — Kho Thóc

## Cấu trúc repo

- `code/` — mã nguồn chạy được (frontend, API, deploy)
- `docs/` — tài liệu, migrate SQL (`docs/db/migrate/`), test script

## JavaScript

- Frontend: ES modules không bundler; file theo trang trong `code/assets/js/pages/`
- API: CommonJS Node.js; routes mỏng, logic trong `src/services/`
- Đặt tên: `camelCase` biến/hàm; `UPPER_SNAKE` hằng config

## SQL

- Migration đặt tại `docs/db/migrate/NNN_mo_ta.sql` (số thứ tự tăng)
- Sau khi thêm migrate: `bash code/kho-thoc-api/scripts/sync-migrations.sh` trước Docker build

## Test

- Domain test: `docs/tests/domain/<domain>/`
- Dùng `docs/tests/common.sh` — biến `CODE_ROOT`, `DOCS_DB`
- Cập nhật `docs/tests/test-case.md` khi thêm case

## Commit

- Message ngắn, tập trung *why*
- Không commit `.env`, `account.txt`, `node_modules/`

## Deploy

- Không push/deploy khi chưa được người dùng xác nhận
- Lệnh deploy: `./code/deploy/vps/deploy.sh --all`
