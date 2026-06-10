# Tài liệu — Kho Thóc Gia Đình

## Vận hành

| File | Nội dung |
|------|----------|
| [installation.md](./installation.md) | Cài đặt lần đầu — macOS local + VPS |
| [operations.md](./operations.md) | Deploy tính năng mới, SSL, xử lý sự cố, backup |

## Specs & nghiệp vụ

| File | Nội dung |
|------|----------|
| [specs/brd.md](./specs/brd.md) | BRD tổng thể + index tính năng |
| [specs/passcode.md](./specs/passcode.md) | Passcode đổi quà |
| [specs/admin.md](./specs/admin.md) | Trang admin |

## Kỹ thuật & thiết kế

| File | Nội dung |
|------|----------|
| [tech/architecture/infrastructure.md](./tech/architecture/infrastructure.md) | Hạ tầng VPS, multi-tenant |
| [tech/architecture/frontend.md](./tech/architecture/frontend.md) | Cấu trúc `code/` |
| [tech/architecture/project-directory.html](./tech/architecture/project-directory.html) | Sơ đồ thư mục (interactive) |
| [tech/migration-vps.md](./tech/migration-vps.md) | Lộ trình migrate GAS → VPS |
| [tech/legacy/apps-script-v11.md](./tech/legacy/apps-script-v11.md) | API GAS (archive) |
| [design/style.md](./design/style.md) | Design system |

## Cấu trúc

```
docs/
├── README.md
├── installation.md
├── operations.md
├── specs/          # brd + đặc tả tính năng
├── tech/           # kiến trúc, migrate, legacy
└── design/         # style guide
```

Config Nginx: `deploy/vps/nginx/` (không có tài liệu markdown riêng — xem `operations.md`).
