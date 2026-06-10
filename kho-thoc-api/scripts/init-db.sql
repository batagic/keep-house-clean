-- User + database RIÊNG cho Kho Thóc — không đụng dữ liệu/user DB eedt.
--
-- Chạy qua setup-db.sh (khuyến nghị):
--   KHO_THOC_DB_PASSWORD='mat_khau_manh' ./scripts/setup-db.sh
--
-- Hoặc thủ công: thay CHANGE_ME bằng mật khẩu, rồi:
--   docker exec -i eedt-postgres psql -U eedt -v ON_ERROR_STOP=1 < scripts/init-db.sql

\set ON_ERROR_STOP on

-- ── 1. Role đăng nhập riêng ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kho_thoc') THEN
    CREATE ROLE kho_thoc LOGIN PASSWORD 'CHANGE_ME';
    RAISE NOTICE 'Created role kho_thoc';
  ELSE
    ALTER ROLE kho_thoc WITH PASSWORD 'CHANGE_ME';
    RAISE NOTICE 'Updated password for kho_thoc';
  END IF;
END
$$;

-- Không cho leo quyền superuser
ALTER ROLE kho_thoc NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

-- ── 2. Database riêng, owner = kho_thoc ──────────────────────────────────
SELECT 'CREATE DATABASE kho_thoc OWNER kho_thoc ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kho_thoc')\gexec

-- ── 3. Tách quyền CONNECT — mỗi app chỉ vào DB của mình ─────────────────
-- Mặc định Postgres grant CONNECT cho PUBLIC → phải revoke PUBLIC trước.

-- DB eedt: chỉ user eedt (app cũ) được kết nối
REVOKE CONNECT ON DATABASE eedt FROM PUBLIC;
GRANT CONNECT ON DATABASE eedt TO eedt;

-- DB postgres (maintenance): chỉ eedt superuser
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
GRANT CONNECT ON DATABASE postgres TO eedt;

-- DB kho_thoc: chỉ kho_thoc + eedt (admin/backup)
REVOKE CONNECT ON DATABASE kho_thoc FROM PUBLIC;
GRANT CONNECT ON DATABASE kho_thoc TO kho_thoc;
GRANT CONNECT ON DATABASE kho_thoc TO eedt;

-- ── 4. Quyền trong schema public của kho_thoc ────────────────────────────
\c kho_thoc

GRANT ALL ON SCHEMA public TO kho_thoc;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kho_thoc;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kho_thoc;
