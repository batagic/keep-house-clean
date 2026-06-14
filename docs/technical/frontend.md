# Frontend — Kho Thóc Gia Đình

Ứng dụng HTML tĩnh, không cần build step. Mở trực tiếp `index.html` hoặc deploy lên GitHub Pages.

## Cấu trúc

```
code/
├── index.html              # Trang chủ (marketing)
├── kho-qua.html            # Catalog quà
├── quy-doi.html            # Máy tính Gạo ↔ VNĐ
├── nhat-ky.html            # App vận hành (bố/mẹ)
├── print.html              # Trang in ấn
└── assets/
    ├── css/
    │   ├── shared/         # Design system dùng chung (marketing pages)
    │   │   ├── variables.css
    │   │   ├── base.css
    │   │   ├── nav.css
    │   │   ├── layout.css
    │   │   ├── buttons.css
    │   │   ├── footer.css
    │   │   └── components.css
    │   └── pages/          # CSS riêng từng trang
    └── js/
        ├── shared/         # nav scroll, reveal, filter tabs
        ├── data/           # tasks, rewards, config (API_URL)
        └── pages/          # Logic riêng từng trang
```

## Quy ước mở rộng

| Loại thay đổi | Thêm/sửa ở đâu |
|---------------|----------------|
| Màu, token design | `assets/css/shared/variables.css` |
| Nav / footer toàn site | `assets/js/shared/site-nav.js` (một nguồn duy nhất) |
| Nav scroll effect | `assets/js/shared/nav.js` |
| Nhiệm vụ / quà mới | `assets/js/data/tasks.js`, `rewards.js` |
| Đổi API backend | `assets/js/data/config.js` |
| Trang marketing mới | Copy pattern từ `index.html`, tạo `assets/css/pages/ten-trang.css` |
| Tính năng app | `nhat-ky.html` + `assets/js/pages/nhat-ky.js` |
| Phiên gia đình | `assets/js/shared/family-api.js` — [family-session.md](../brd/family-session.md) |

## Phiên gia đình (`family-api.js`)

| Key localStorage | Ý nghĩa |
|------------------|---------|
| `kho_thoc_family_id` | `family_id` sau `unlock_family` hoặc đăng ký bé đầu |
| `kho_thoc_family_unlocked` | Cờ `"1"` — đã mở phiên trên trình duyệt này |

**Không** lưu plain text passcode. Đổi quà dùng modal riêng (tầng 2) mỗi lần.


## Trang → assets

| Trang | CSS | JS |
|-------|-----|-----|
| `index.html` | shared/* + `pages/index.css` | `nav.js`, `reveal.js`, `pages/index.js` |
| `kho-qua.html` | shared/* + `pages/kho-qua.css` | + `filter-cards.js` |
| `quy-doi.html` | shared/* + `pages/quy-doi.css` | + `pages/quy-doi.js`, Chart.js CDN |
| `print.html` | shared (không layout/footer) + `pages/print.css` | `nav.js`, `filter-cards.js` (không có logic riêng) |
| `nhat-ky.html` | `pages/nhat-ky.css` only | `family-api.js` + `data/*` + `pages/nhat-ky.js` |
