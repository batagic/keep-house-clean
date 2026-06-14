# keep-house-clean

Gamification to learn finance and keep house clean (for child).

**Bắt đầu:** [docs/project-guide.html](docs/project-guide.html) — bản đồ chỉ dẫn toàn dự án.

**Deploy:** `./ops/vps/deploy.sh --all` · **Test:** `bash tests/domain/nhatky/nhatky.sh`

## Redirect tại root

Mã frontend nằm trong `code/`, nhưng GitHub Pages phục vụ từ **root repo** (`/keep-house-clean/`). Các file HTML mỏng tại root (`index.html`, `nhat-ky.html`, `kho-qua.html`, `quy-doi.html`, `print.html`, `admin/…`) dùng `<meta refresh>` chuyển hướng sang `code/…` tương ứng.

**Vì sao cần:** URL cũ và bookmark (`…/keep-house-clean/nhat-ky.html`) vẫn hoạt động sau khi gom mã nguồn vào `code/`; không phải nhân đôi toàn bộ assets. Production vẫn dùng `code/nhat-ky.html` làm entry chính.
