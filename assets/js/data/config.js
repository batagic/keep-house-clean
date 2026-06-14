/** Cấu hình toàn app — chọn MỘT API_URL (xem docs/installation.md, docs/operations.md) */

// Production — GitHub Pages → VPS (sau khi HTTPS apinhatkyvumua.taho.cat OK):
// const API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc/'; // trailing / bắt buộc

// Local dev:
// const API_URL = 'http://localhost:3001';

const API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc/'; // trailing / bắt buộc (tránh Nginx 301)

// Rollback Google Apps Script:
// const API_URL = 'https://script.google.com/macros/s/AKfycbwrQ4WC4WnZ4X33RQScOnOG5RFHAVblqIYEhNVfHJENAAzRe-rGEN-5ICobJFp-oTHYeg/exec';
/** GAS yêu cầu text/plain (CORS); VPS dùng application/json */
const API_USE_PLAIN_TEXT = API_URL.includes('script.google.com');
/** Admin API — cùng host VPS, path /admin */
const ADMIN_API_URL = API_URL.replace(/\/?$/, '/') + 'admin/';
const GRAIN_RATE = 100; // 1 Gạo = 100 VNĐ
/** Số bé tối đa mỗi gia đình */
const MAX_PROFILES_PER_FAMILY = 3;
