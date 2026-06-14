# Tài liệu — Kho Thóc Gia Đình

**Bắt đầu tại:** [project-guide.html](./project-guide.html) — mindmap chỉ dẫn toàn dự án.

## Cấu trúc

```
docs/
├── project-guide.html     # ★ Đọc đầu tiên
├── snapshot.json          # Hiện trạng dự án (JSON)
├── brd/                   # Nghiệp vụ theo domain
├── technical/             # Kiến trúc, vận hành, dev/prod
├── db/                    # README + migrate mirror + seed SQL
│   ├── README.md          # ★ Hai thư mục migrations — đọc trước
│   └── migrate/
├── prototypes/            # HTML thử nghiệm — không deploy
└── ui/ux/                 # Design system (style.html)
```

Test script: [`../tests/`](../tests/) · Deploy: [`../ops/`](../ops/)

## BRD & nghiệp vụ

| File | Nội dung |
|------|----------|
| [brd/brd.md](./brd/brd.md) | BRD tổng thể |
| [brd/usecase-actor.md](./brd/usecase-actor.md) | Actor, use case, tương tác domain |
| [brd/family-session.md](./brd/family-session.md) | Phiên gia đình — passcode tầng 1 |
| [brd/nhatky.md](./brd/nhatky.md) | Cách ly gia đình, giới hạn bé |
| [brd/passcode.md](./brd/passcode.md) | Passcode đổi quà + hai tầng |
| [brd/admin.md](./brd/admin.md) | Trang admin |

## Kỹ thuật & vận hành

| File | Nội dung |
|------|----------|
| [technical/dev.md](./technical/dev.md) | Cài đặt dev local |
| [technical/prod.md](./technical/prod.md) | Triển khai production VPS |
| [technical/operator.md](./technical/operator.md) | Vận hành, sự cố, backup |
| [technical/fast-operation.md](./technical/fast-operation.md) | Lệnh hay dùng |
| [technical/hld.html](./technical/hld.html) | High-level design |
| [technical/architech.html](./technical/architech.html) | Quyết định kiến trúc |

## Test & DB

| File | Nội dung |
|------|----------|
| [../tests/test-case.md](../tests/test-case.md) | Bảng ID test |
| [../tests/domain/nhatky/nhatky.sh](../tests/domain/nhatky/nhatky.sh) | Chạy test domain Nhật Ký |
| [db/README.md](./db/README.md) | Migrations: nguồn chạy vs bản sao operator |
| [db/migrate/](./db/migrate/) | SQL mirror (sync từ API) |
