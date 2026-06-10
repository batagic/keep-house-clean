#!/usr/bin/env bash
# Kiểm tra user/database kho_thoc đã tách biệt đúng chưa.
#
# Usage:
#   KHO_THOC_DB_PASSWORD='...' ./scripts/verify-db.sh

set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-eedt-postgres}"
SUPERUSER="${POSTGRES_SUPERUSER:-eedt}"

if [[ -z "${KHO_THOC_DB_PASSWORD:-}" ]]; then
  read -rsp "Mật khẩu user kho_thoc: " KHO_THOC_DB_PASSWORD
  echo
fi

echo "── Danh sách database ──"
docker exec "$CONTAINER" psql -U "$SUPERUSER" -c "\l" | grep -E 'Name|kho_thoc|eedt' || true

echo ""
echo "── User kho_thoc ──"
docker exec "$CONTAINER" psql -U "$SUPERUSER" -c "\du kho_thoc"

echo ""
echo "── Kết nối bằng user kho_thoc → DB kho_thoc ──"
docker exec -e PGPASSWORD="$KHO_THOC_DB_PASSWORD" "$CONTAINER" \
  psql -U kho_thoc -d kho_thoc -c "SELECT current_user AS user, current_database() AS db;"

echo ""
echo "── Thử kho_thoc KHÔNG được vào DB eedt (phải báo lỗi) ──"
if docker exec -e PGPASSWORD="$KHO_THOC_DB_PASSWORD" "$CONTAINER" \
  psql -U kho_thoc -d eedt -c "SELECT 1" 2>/dev/null; then
  echo "❌ kho_thoc vẫn truy cập được DB eedt — cần chạy lại setup-db.sh"
  exit 1
else
  echo "✅ kho_thoc bị chặn truy cập DB eedt (đúng mong muốn)"
fi

echo ""
echo "✅ Kiểm tra xong."
