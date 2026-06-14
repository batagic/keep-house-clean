# Nghiệp vụ — Kho Thóc Gia Đình (Nhật Ký)

**Cập nhật:** 14/06/2026

## Cách ly dữ liệu theo gia đình

Mỗi gia đình có **`family_id`** trên server (`profiles.family_id`). Client gửi header `X-Family-Id` trên mọi request API từ trang Nhật Ký.

**Phase 3.1:** `family_id` trên client **không** tự sinh ngẫu nhiên nữa — lấy từ **phiên passcode** (tầng 1) hoặc khi **đăng ký bé đầu tiên**. Chi tiết: [family-session.md](./family-session.md).

| Tình huống | Hành vi |
|------------|---------|
| Chưa mở phiên (chưa nhập passcode / chưa bootstrap) | Danh sách bé **trống** — không thấy gia đình khác |
| Đã mở phiên (passcode tầng 1 hoặc đăng ký bé đầu) | Chỉ thấy bé thuộc `family_id` của gia đình |
| Gia đình legacy (cache profile cũ) | Tự nhận `fam_v1_default` qua `migrateLegacyFamilyIfNeeded` |
| Xóa cache / trình duyệt mới | Mất phiên → nhập passcode tầng 1 lại |

**Giới hạn:** tối đa **3 bé / gia đình** (đếm theo `family_id`).

**Admin** (`/admin`) vẫn xem mọi bé — không filter theo gia đình.

---

## Passcode trên trang Nhật Ký

| Thao tác | Passcode |
|----------|----------|
| Mở phiên / xem bé | Tầng 1 — một lần cho đến khi mất cache |
| Ghi nhiệm vụ, xóa log, xóa bé | Không (sau khi đã mở phiên) |
| Đổi quà | Tầng 2 — **mỗi lần** đổi |
| Đăng ký bé **đầu tiên** | Không cần passcode trước (bootstrap) |

→ [passcode.md](./passcode.md) · [family-session.md](./family-session.md)
