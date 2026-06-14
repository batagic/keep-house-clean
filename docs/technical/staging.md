# Staging

**Hiện tại dự án không có môi trường staging riêng.**

| Môi trường | Frontend | API | Ghi chú |
|------------|----------|-----|---------|
| Dev | `localhost:5500` | `localhost:3001` | Docker + Postgres local |
| Production | GitHub Pages `/code/` | VPS `apinhatkyvumua.taho.cat` | Cutover trực tiếp |

Khi cần staging: nhân bản stack VPS với subdomain + DB `kho_thoc_staging`, cập nhật file này.
