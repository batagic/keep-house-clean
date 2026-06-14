# Lệnh nhanh — Dev & Prod

## Dev local (macOS)

```bash
# Frontend
cd code && python3 -m http.server 5500
# Mở http://localhost:5500/index.html — sửa code/assets/js/data/config.js → localhost API

# API
cd code/kho-thoc-api
bash scripts/sync-migrations.sh
docker compose up -d --build
docker compose exec kho-thoc-api node scripts/migrate.js
# hoặc: npm run dev
curl -s 'http://localhost:3001/?type=ping'
```

## Test

```bash
bash docs/tests/domain/nhatky/nhatky.sh
API_URL='http://localhost:3001/kho-thoc/' bash docs/tests/domain/nhatky/nhatky.sh
bash docs/tests/coverage.sh
```

## Prod (Mac → VPS)

```bash
./code/deploy/vps/deploy.sh              # chỉ API
./code/deploy/vps/deploy.sh --all        # API + git push (GitHub Pages)
ssh kho-thoc-vps
curl -s 'https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping'
```

## DB

```bash
# Dev — tạo user/DB
cd code/kho-thoc-api
KHO_THOC_DB_PASSWORD='...' ./scripts/setup-db.sh

# Migrate (dev/prod)
docker compose exec kho-thoc-api node scripts/migrate.js
```

## Git

```bash
git status
git push origin main
```
