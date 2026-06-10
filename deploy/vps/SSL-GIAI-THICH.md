# SSL terminate ở đâu? — Giải thích ngắn

**SSL terminate** = chỗ nào **giải mã HTTPS** (có chứng chỉ `https://`), trước khi chuyển request vào Docker.

## Hai tầng thường gặp trên VPS

```
                    ┌─ Cách 1: Host Nginx (phổ biến với bạn) ─────────────────┐
                    │                                                         │
Trình duyệt ──HTTPS──► Host Nginx :443  (cert Let's Encrypt)                 │
                    │        │                                              │
                    │        ├── HTTP ──► localhost:8082 ──► eedt-nginx      │
                    │        └── HTTP ──► localhost:3001 ──► kho-thoc-api    │
                    └─────────────────────────────────────────────────────────┘

                    ┌─ Cách 2: SSL trong container Nginx ────────────────────┐
                    │                                                         │
Trình duyệt ──HTTPS──► eedt-nginx :443  (cert mount vào container)           │
                    │        └── HTTP ──► kho-thoc-api:3001                  │
                    └─────────────────────────────────────────────────────────┘
```

## VPS của bạn — manh mối

```text
eedt-nginx   PORTS: 0.0.0.0:8082->80/tcp   (chỉ HTTP, không có :443)
```

→ Container `eedt-nginx` **không** lắng nghe HTTPS trực tiếp ra internet.  
→ Rất có thể **Host Nginx** (cài trên Ubuntu, `systemctl status nginx`) đang:
- nhận `https://...taho.cat` trên cổng **443**
- proxy xuống `http://127.0.0.1:8082` (eedt) hoặc port khác

## Cách tự kiểm tra trên VPS

```bash
# Host Nginx có chạy không?
sudo systemctl status nginx

# Có process nào listen :443 không?
sudo ss -tlnp | grep ':443'

# Cert Let's Encrypt đã có cho taho.cat chưa?
sudo ls /etc/letsencrypt/live/ 2>/dev/null
```

| Kết quả | Nghĩa |
|---------|--------|
| `nginx` active + có `:443` | **SSL terminate ở Host Nginx** ← khả năng cao |
| Không có host nginx, chỉ Docker | Có thể dùng **Cloudflare** proxy SSL, hoặc chưa setup HTTPS |
| `certbot` có thư mục `apinhatkyvumua.taho.cat` | Đã có cert cho subdomain API |

## Việc cần làm cho GitHub Pages

Frontend `https://batagic.github.io` **bắt buộc** gọi được:

```text
https://apinhatkyvumua.taho.cat/kho-thoc/?type=ping
```

→ Phải có **HTTPS trên cổng 443** cho domain `apinhatkyvumua.taho.cat` (Host Nginx + certbot là cách thường dùng).

## Lưu ý CORS + trailing slash

Frontend GitHub Pages gọi `${API_URL}?type=profiles`. Vì vậy:

- `config.js`: `API_URL = 'https://apinhatkyvumua.taho.cat/kho-thoc/'` (**có `/` cuối**)
- Nginx: `location /kho-thoc { proxy_pass http://127.0.0.1:3001; }` — **không** `return 301` từ `/kho-thoc` sang `/kho-thoc/`

Nếu thiếu `/` cuối, URL thành `/kho-thoc?type=...` → Nginx trả **301** → trình duyệt chặn `fetch` cross-origin.
