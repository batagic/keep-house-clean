# Import CSV từ Google Sheets

Đặt 2 file export vào thư mục này:

| File | Nguồn |
|------|--------|
| `profiles.csv` | Sheet **Profiles** |
| `logs.csv` | Sheet **Logs** |

Google Sheets → **File → Download → Comma Separated Values (.csv)**

Sau đó (migrate **lần đầu** từ Sheets):

```bash
docker compose exec kho-thoc-api node scripts/import-csv.js \
  --profiles ./data/profiles.csv \
  --logs ./data/logs.csv \
  --reset
```

**Không** chạy lại import sau mỗi deploy — CSV trong repo thường cũ hơn dữ liệu live trên VPS và sẽ làm giảm Gạo.

Hoặc trên máy host (`.env` dùng `localhost`):

```bash
npm run import:csv -- --profiles ./data/profiles.csv --logs ./data/logs.csv
```
