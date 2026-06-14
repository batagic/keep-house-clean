# Nghiệp vụ — Kho Thóc Gia Đình

**Cập nhật:** 14/06/2026

## Cách ly dữ liệu theo gia đình

Mỗi trình duyệt gia đình có một **mã gia đình** (`family_id`) lưu trong `localStorage`. Mọi request API từ trang Nhật Ký gửi kèm header `X-Family-Id`.

| Tình huống | Hành vi |
|------------|---------|
| Ba/mẹ **chưa đăng ký bé nào** (gia đình mới) | Danh sách bé **trống** — không thấy bé của gia đình khác |
| Ba/mẹ đã đăng ký bé | Chỉ thấy và thao tác được bé thuộc `family_id` của mình |
| Gia đình đã dùng app trước khi bật tính năng | Bé cũ gán `fam_v1_default`; trình duyệt có cache profile tự nhận mã legacy |

**Giới hạn:** tối đa **3 bé / gia đình** (đếm theo `family_id`, không phải toàn hệ thống).

**Admin** (`/admin`) vẫn xem được mọi bé — không bị filter theo gia đình.
