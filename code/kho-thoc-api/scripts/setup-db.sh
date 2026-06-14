#!/usr/bin/env bash
# Tạo user kho_thoc + database kho_thoc trên eedt-postgres (chạy một lần / mỗi máy).
#
# Usage:
#   KHO_THOC_DB_PASSWORD='mat_khau_manh' ./scripts/setup-db.sh
#
# Tùy chọn:
#   POSTGRES_CONTAINER=eedt-postgres
#   POSTGRES_SUPERUSER=eedt

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="${POSTGRES_CONTAINER:-eedt-postgres}"
SUPERUSER="${POSTGRES_SUPERUSER:-eedt}"
DB_USER="kho_thoc"
DB_NAME="kho_thoc"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "❌ Container '$CONTAINER' không chạy. Khởi động eedt-postgres trước."
  exit 1
fi

if [[ -z "${KHO_THOC_DB_PASSWORD:-}" ]]; then
  read -rsp "Nhập mật khẩu cho user PostgreSQL '$DB_USER': " KHO_THOC_DB_PASSWORD
  echo
  read -rsp "Nhập lại mật khẩu: " KHO_THOC_DB_PASSWORD_CONFIRM
  echo
  if [[ "$KHO_THOC_DB_PASSWORD" != "$KHO_THOC_DB_PASSWORD_CONFIRM" ]]; then
    echo "❌ Mật khẩu không khớp."
    exit 1
  fi
fi

if [[ ${#KHO_THOC_DB_PASSWORD} -lt 12 ]]; then
  echo "⚠️  Khuyến nghị mật khẩu ≥ 12 ký tự."
fi

# Escape single quotes cho SQL
SQL_PASS="${KHO_THOC_DB_PASSWORD//\'/\'\'}"

TMP_SQL="$(mktemp)"
trap 'rm -f "$TMP_SQL"' EXIT

sed "s/CHANGE_ME/${SQL_PASS}/g" "$ROOT/scripts/init-db.sql" > "$TMP_SQL"

echo "→ Tạo/cập nhật user '$DB_USER' và database '$DB_NAME' trên $CONTAINER …"
docker exec -i "$CONTAINER" psql -U "$SUPERUSER" -v ON_ERROR_STOP=1 < "$TMP_SQL"

echo ""
echo "✅ Database sẵn sàng."
echo ""
echo "Thêm vào kho-thoc-api/.env:"
echo "  DATABASE_URL=postgresql://${DB_USER}:<mat_khau>@eedt-postgres:5432/${DB_NAME}"
echo "  (npm run dev trên máy host: thay eedt-postgres → localhost)"
echo ""
echo "Kiểm tra:"
echo "  ./scripts/verify-db.sh"
