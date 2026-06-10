# Snapshot — Kho Thóc Gia Đình

**Cập nhật:** 10/06/2026  
**Mục đích:** File ngữ cảnh duy nhất — đọc file này ở đầu phiên làm việc mới để nắm toàn bộ dự án, quyết định và trạng thái hiện tại.

---

## 1. Quy trình làm việc với AI (bắt buộc)

### Sau khi code xong một tính năng

AI **phải hỏi** người dùng:

> *Bạn có muốn deploy lên VPS và push lên Git không?*

| Người dùng chọn | AI thực hiện |
|-----------------|--------------|
| **Có** | (1) Commit nếu còn thay đổi chưa commit → `git push origin main` → (2) `./deploy/vps/deploy.sh --all` |
| **Không** | Dừng — không push, không deploy |

### Chi tiết deploy khi người dùng chọn Có

1. **Git push** — đẩy `main` lên GitHub → GitHub Pages tự cập nhật frontend (~1–2 phút).
2. **VPS deploy** — chạy `./deploy/vps/deploy.sh --all` (hoặc `deploy.sh` nếu chỉ đổi API):
   - Yêu cầu SSH key đã cấu hình (`./deploy/vps/setup-ssh.sh` — một lần).
   - Rsync code → Docker rebuild → kiểm tra HTTPS.

### Lưu ý cho AI

- **Không** tự ý commit/push/deploy khi người dùng chưa xác nhận.
- **Không** sửa `git config` global trên máy người dùng.
- Commit message ngắn gọn, tập trung *why*.
- Nếu SSH chưa cấu hình → hướng dẫn chạy `setup-ssh.sh` trước.

---

## 2. Tổng quan sản phẩm

**Kho Thóc Gia Đình** — gamification việc nhà cho gia đình (bé 10–15 tuổi).

| Tiền tệ | Ý nghĩa |
|---------|---------|
| 🌾 **Gạo** | Phần thưởng làm việc; đổi quà; quy đổi VNĐ (1 Gạo = 100đ) |
| ⭐ **EXP** | Kinh nghiệm → 5 cấp Quản Gia |

| Vai trò | Trang chính |
|---------|-------------|
| Bố/mẹ | `nhat-ky.html` — ghi nhật ký, đổi quà, CRUD bé |
| Bé | `kho-qua.html`, `quy-doi.html` — xem quà, lập kế hoạch |
| Admin | `admin/login.html` — sinh/thu hồi passcode đổi quà |

**Repo:** `https://github.com/batagic/keep-house-clean`

---

## 3. Kiến trúc hiện tại

```
Trình duyệt (GitHub Pages)
    │  API_URL = https://apinhatkyvumua.taho.cat/kho-thoc/
    ▼
Host Nginx :443 (SSL terminate)
    ▼
Docker kho-thoc-api :3001
    ▼
Postgres kho_thoc (container eedt-postgres, chung host VPS)
```

| Thành phần | Host | Cập nhật |
|------------|------|----------|
| Frontend HTML/JS/CSS | GitHub Pages | `git push main` |
| API Node.js | VPS Docker | `./deploy/vps/deploy.sh` |
| Database | VPS Postgres | Migration khi có SQL mới |
| Legacy API | Google Apps Script | Rollback — comment trong `config.js` |

### URL production

| | URL |
|---|-----|
| Frontend | https://batagic.github.io/keep-house-clean/nhat-ky.html |
| API | https://apinhatkyvumua.taho.cat/kho-thoc/ |
| Admin UI | https://batagic.github.io/keep-house-clean/admin/login.html |
| Admin API | https://apinhatkyvumua.taho.cat/kho-thoc/admin/ |

### VPS

| | Giá trị |
|---|--------|
| IP | `64.176.85.165` |
| Domain API | `apinhatkyvumua.taho.cat` |
| Thư mục | `/opt/nhatkyvumua` |
| SSH alias | `kho-thoc-vps` (key `~/.ssh/kho_thoc_vps`) |
| Docker network | `docker_eedt-net` (chung `eedt-postgres`) |

---

## 4. Cấu trúc repo (phần quan trọng)

```
keep-house-clean/
├── snapshot.md              ← file này
├── index.html, nhat-ky.html, kho-qua.html, quy-doi.html, print.html
├── admin/                   # Phase 2 — dashboard admin
├── assets/
│   ├── js/data/config.js    # API_URL — điểm cutover production
│   ├── js/pages/nhat-ky.js  # Logic trang bố mẹ
│   └── css/pages/
├── kho-thoc-api/            # API Node + Postgres
│   ├── src/routes/api.js    # GET/POST contract
│   ├── src/services/        # profiles, logs, redeem, auth
│   └── migrations/          # 001 init, 002 redeem auth, 003 passcodes
├── deploy/vps/
│   ├── deploy.sh            # ★ Một lệnh deploy từ Mac
│   ├── setup-ssh.sh         # ★ Cấu hình SSH key (một lần)
│   └── deploy-api.sh        # Bước trên VPS (gọi tự động)
└── docs/                    # installation, operations, specs, tech
```

---

## 5. API contract (tóm tắt)

| POST `type` | Mô tả |
|-------------|-------|
| `profile` | Tạo/cập nhật bé |
| `delete_profile` | Xóa bé + logs + passcode (CASCADE) |
| `log` | Ghi nhật ký nhiệm vụ |
| `delete_log` | Xóa một dòng nhật ký |
| `redeem` | Đổi quà (cần passcode) |

| GET `type` | Mô tả |
|------------|-------|
| `ping` | Health check |
| `profiles` | Danh sách bé |
| `logs` | Nhật ký (phân trang) |

Chi tiết: `kho-thoc-api/README.md`, `docs/tech/legacy/apps-script-v11.md`

---

## 6. Tính năng đã triển khai

| Tính năng | Trạng thái | Ghi chú |
|-----------|:----------:|---------|
| 15 nhiệm vụ + bonus tự giác 20% | ✅ | `assets/js/data/tasks.js` |
| Ghi/xóa nhật ký | ✅ | Optimistic UI + cache localStorage |
| Đăng ký bé mới | ✅ | Tự sinh passcode đổi quà |
| **Xóa bé (bố/mẹ)** | ✅ | Nút 🗑️ trên thẻ bé; API `delete_profile` |
| Đổi quà + passcode | ✅ | Phase 2 |
| Trang admin JWT | ✅ | Sinh/thu hồi mã theo bé |
| Deploy một lệnh + SSH key | ✅ | PR #1 merged |
| Migrate GAS → VPS | ✅ | Production cutover |
| Import CSV | ⏳ | Script có, chưa chạy production |
| Cron backup `pg_dump` | ❌ | |
| Multi-tenant Phase 3 | ❌ | |
| Sửa hồ sơ bé (edit name/avatar) | ❌ | Chỉ create + delete |

---

## 7. Quyết định kỹ thuật đã chốt

| # | Quyết định | Lý do |
|---|------------|-------|
| D1 | Postgres riêng `kho_thoc` trong container `eedt-postgres` | Tách DB khỏi eedt, không tốn RAM container mới |
| D2 | `API_URL` có **trailing slash** `/kho-thoc/` | Tránh Nginx 301 → lỗi CORS |
| D3 | SSL terminate trên Host Nginx, không trong Docker | `eedt-nginx` chỉ HTTP :8082 |
| D4 | Passcode riêng từng bé, không mã global | Phase 2 spec |
| D5 | Đổi quà bắt buộc `type=redeem` + passcode | Chặn POST log giả `REDEEM` |
| D6 | Deploy Mac → VPS qua **rsync**, không phụ thuộc `git pull` trên VPS | Tránh lỗi dubious ownership |
| D7 | SSH key VPS tách (`kho_thoc_vps`), GitHub dùng `id_rsa` | Bảo mật + tách môi trường |
| D8 | Frontend GitHub Pages, API VPS | Chi phí thấp, tách static/dynamic |
| D9 | Sau mỗi tính năng: **hỏi** trước khi push + deploy | Quy trình người dùng (§1) |

---

## 8. Trạng thái Git (10/06/2026)

| | |
|---|---|
| Branch chính | `main` |
| Commit mới nhất `main` | `4a6b71f` — Merge PR #1 (deploy scripts) |
| Commit trước | `27508b0` — delete child feature |
| `gh` CLI | Đã login `batagic` |
| Git protocol | SSH (`id_rsa`) |

### Lịch sử phiên gần nhất

1. Thêm xóa bé (frontend + API `delete_profile`).
2. Tạo `deploy.sh`, `setup-ssh.sh` — deploy một lệnh, SSH không mật khẩu.
3. PR #1 merged vào `main`.

---

## 9. Lệnh thường dùng

```bash
# Dev local
cd kho-thoc-api && npm run dev          # API :3001
python3 -m http.server 5500               # Frontend (sửa config.js → localhost)

# SSH VPS (sau setup-ssh.sh)
ssh kho-thoc-vps

# Deploy production (từ Mac)
./deploy/vps/deploy.sh --all

# Kiểm tra API
curl -s 'https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping'
```

---

## 10. Khoảng trống / việc tiếp theo

| Ưu tiên | Việc |
|---------|------|
| Cao | Deploy tính năng xóa bé lên VPS (nếu chưa chạy `deploy.sh` sau merge) |
| Cao | Cập nhật BRD §13 G5 — đã có UI xóa bé |
| Trung bình | UI sửa tên/avatar bé |
| Trung bình | Cron `pg_dump` hàng ngày |
| Thấp | Import CSV dữ liệu GAS cũ |
| Thấp | Phase 3 multi-tenant |

---

## 11. Tài liệu tham chiếu

| File | Nội dung |
|------|----------|
| [docs/installation.md](docs/installation.md) | Cài đặt lần đầu |
| [docs/operations.md](docs/operations.md) | Deploy, SSL, sự cố |
| [docs/specs/brd.md](docs/specs/brd.md) | Nghiệp vụ tổng thể |
| [docs/specs/passcode.md](docs/specs/passcode.md) | Passcode đổi quà |
| [docs/specs/admin.md](docs/specs/admin.md) | Admin |
| [deploy/vps/README.md](deploy/vps/README.md) | Script deploy |

---

*Khi có thay đổi lớn (kiến trúc, quyết định, tính năng ship, URL) — cập nhật file này cuối phiên làm việc.*
