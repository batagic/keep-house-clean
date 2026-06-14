# Triển khai Production — VPS

Sau khi VPS đã chạy → deploy tính năng mới: [operator.md](./operator.md).

## Thông số

| | Giá trị |
|---|--------|
| IP | `64.176.85.165` |
| Domain API | `apinhatkyvumua.taho.cat` |
| Thư mục | `/opt/nhatkyvumua` |
| Frontend | `https://batagic.github.io/keep-house-clean/code/nhat-ky.html` |
| API | `https://apinhatkyvumua.taho.cat/kho-thoc/` (có `/` cuối) |

## Cài đặt lần đầu (VPS)

```bash
mkdir -p /opt/nhatkyvumua && cd /opt/nhatkyvumua
git clone https://github.com/batagic/keep-house-clean.git repo
rsync -a repo/code/kho-thoc-api/ ./kho-thoc-api/ --exclude node_modules --exclude .env --exclude data
rsync -a repo/docs/db/migrate/ ./kho-thoc-api/migrations/
mkdir -p kho-thoc-api/data && chmod +x kho-thoc-api/scripts/*.sh
```

### Database

```bash
cd /opt/nhatkyvumua/kho-thoc-api
export KHO_THOC_DB_PASSWORD='MAT_KHAU_DB_MANH'
./scripts/setup-db.sh && ./scripts/verify-db.sh
```

### `.env` production

```bash
JWT_SECRET=$(openssl rand -base64 48)
cat > /opt/nhatkyvumua/kho-thoc-api/.env << EOF
PORT=3001
BASE_PATH=/kho-thoc
DATABASE_URL=postgresql://kho_thoc:MAT_KHAU_DB_MANH@eedt-postgres:5432/kho_thoc
CORS_ORIGINS=https://batagic.github.io
EEDT_DOCKER_NETWORK=docker_eedt-net
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
EOF
```

### Chạy API + migrate + admin

```bash
cd /opt/nhatkyvumua/kho-thoc-api
docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js
docker compose exec kho-thoc-api npm run seed:admin -- \
  --username admin --password 'MAT_KHAU_ADMIN'
curl -s 'http://127.0.0.1:3001/kho-thoc/?type=ping'
```

### Nginx

Config mẫu: `code/deploy/vps/nginx/apinhatkyvumua.taho.cat.conf`

```bash
cp /opt/nhatkyvumua/repo/code/deploy/vps/nginx/apinhatkyvumua.taho.cat.conf \
  /etc/nginx/sites-available/apinhatkyvumua.taho.cat.conf
```

## Deploy từ Mac (hàng ngày)

```bash
./code/deploy/vps/setup-ssh.sh          # một lần
./code/deploy/vps/deploy.sh --all       # push GitHub Pages + API VPS
```

## Migrate SQL mới trên prod

```bash
# Sau khi deploy code có file mới trong docs/db/migrate/
ssh kho-thoc-vps
cd /opt/nhatkyvumua/kho-thoc-api
docker compose exec kho-thoc-api node scripts/migrate.js
```
