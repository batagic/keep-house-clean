# Deploy VPS — config & scripts

Tài liệu: [docs/technical/operator.md](../../../docs/technical/operator.md) · [docs/technical/prod.md](../../../docs/technical/prod.md)

## Bước 0 — SSH không mật khẩu (một lần trên Mac)

```bash
./ops/vps/setup-ssh.sh
```

Script sẽ:

1. Tạo key `~/.ssh/kho_thoc_vps` (ed25519)
2. Lưu key vào macOS Keychain
3. Thêm alias `kho-thoc-vps` vào `~/.ssh/config`
4. `ssh-copy-id` lên VPS — **nhập mật khẩu root lần cuối**
5. Kiểm tra `ssh kho-thoc-vps` không hỏi mật khẩu

### Cấu hình thủ công (nếu không dùng script)

```bash
# 1. Tạo key
ssh-keygen -t ed25519 -f ~/.ssh/kho_thoc_vps -C "kho-thoc-deploy" -N ""

# 2. Thêm vào Keychain (macOS)
ssh-add --apple-use-keychain ~/.ssh/kho_thoc_vps

# 3. Copy key lên VPS (nhập mật khẩu một lần)
ssh-copy-id -i ~/.ssh/kho_thoc_vps.pub root@64.176.85.165

# 4. Thêm vào ~/.ssh/config:
```

```
Host kho-thoc-vps
  HostName 64.176.85.165
  User root
  IdentityFile ~/.ssh/kho_thoc_vps
  IdentitiesOnly yes
  AddKeysToAgent yes
  UseKeychain yes
```

```bash
# 5. Kiểm tra
ssh -o BatchMode=yes kho-thoc-vps echo ok
```

---

## Deploy một lệnh

```bash
# Chỉ API lên VPS
./ops/vps/deploy.sh

# API + push GitHub Pages (frontend)
./ops/vps/deploy.sh --all
```

`deploy.sh` yêu cầu SSH key đã cấu hình (`setup-ssh.sh`). Không hỏi mật khẩu VPS.

| File | Mục đích |
|------|----------|
| **`setup-ssh.sh`** | Cấu hình SSH key — chạy **một lần** |
| **`deploy.sh`** | Deploy một lệnh từ Mac |
| `deploy-api.sh` | Bước trên VPS (gọi tự động) |
| `deploy-from-mac.sh` | Alias → `deploy.sh` |
| `setup-vps.sh` | Cài thư mục lần đầu **trên VPS** |
| `nginx/` | Config Nginx |
| `.env.production.example` | Mẫu `.env` VPS |

### Tuỳ chọn

```bash
VPS_HOST=kho-thoc-vps ./ops/vps/deploy.sh
VERIFY_PATTERN=delete_profile ./ops/vps/deploy.sh
```
