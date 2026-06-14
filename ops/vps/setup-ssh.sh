#!/usr/bin/env bash
# Cấu hình SSH key — một lần trên Mac, sau đó deploy không cần mật khẩu.
#
#   ./code/deploy/vps/setup-ssh.sh
#
# Biến môi trường (tuỳ chọn):
#   VPS_IP=64.176.85.165
#   VPS_USER=root
#   SSH_HOST_ALIAS=kho-thoc-vps
#   SSH_KEY_PATH=~/.ssh/kho_thoc_vps

set -euo pipefail

VPS_IP="${VPS_IP:-64.176.85.165}"
VPS_USER="${VPS_USER:-root}"
SSH_HOST_ALIAS="${SSH_HOST_ALIAS:-kho-thoc-vps}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/kho_thoc_vps}"
SSH_CONFIG="${SSH_CONFIG:-$HOME/.ssh/config}"
MARKER_BEGIN="# --- kho-thoc-vps (keep-house-clean) ---"
MARKER_END="# --- end kho-thoc-vps ---"

log()  { printf '\n\033[1;36m→ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✅ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠️  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m❌ %s\033[0m\n' "$*" >&2; exit 1; }

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

# ── 1. Tạo SSH key (ed25519) ──────────────────────────────────
if [[ -f "${SSH_KEY_PATH}" ]]; then
  ok "Đã có key: ${SSH_KEY_PATH}"
else
  log "Tạo SSH key mới (ed25519, không passphrase)"
  ssh-keygen -t ed25519 \
    -f "${SSH_KEY_PATH}" \
    -C "kho-thoc-deploy@$(hostname -s 2>/dev/null || hostname)" \
    -N ""
  ok "Đã tạo ${SSH_KEY_PATH}"
fi

chmod 600 "${SSH_KEY_PATH}"
chmod 644 "${SSH_KEY_PATH}.pub"

# ── 2. Thêm key vào ssh-agent (macOS Keychain) ────────────────
log "Thêm key vào ssh-agent"
if [[ "$(uname -s)" == "Darwin" ]]; then
  if ssh-add --apple-use-keychain "${SSH_KEY_PATH}" 2>/dev/null; then
    ok "Key đã lưu trong macOS Keychain"
  elif ssh-add -K "${SSH_KEY_PATH}" 2>/dev/null; then
    ok "Key đã lưu trong Keychain (legacy)"
  else
    ssh-add "${SSH_KEY_PATH}" || warn "Không thêm được vào ssh-agent — vẫn deploy được nếu có IdentityFile"
  fi
else
  ssh-add "${SSH_KEY_PATH}" 2>/dev/null || true
fi

# ── 3. Ghi ~/.ssh/config ──────────────────────────────────────
log "Cấu hình SSH host alias: ${SSH_HOST_ALIAS}"
touch "${SSH_CONFIG}"
chmod 600 "${SSH_CONFIG}"

if grep -qF "${MARKER_BEGIN}" "${SSH_CONFIG}" 2>/dev/null; then
  ok "Đã có block ${SSH_HOST_ALIAS} trong ${SSH_CONFIG}"
else
  cat >> "${SSH_CONFIG}" <<EOF

${MARKER_BEGIN}
Host ${SSH_HOST_ALIAS}
  HostName ${VPS_IP}
  User ${VPS_USER}
  IdentityFile ${SSH_KEY_PATH}
  IdentitiesOnly yes
  AddKeysToAgent yes
  UseKeychain yes
${MARKER_END}
EOF
  ok "Đã thêm Host ${SSH_HOST_ALIAS} → ${VPS_USER}@${VPS_IP}"
fi

# ── 4. Copy public key lên VPS (nhập mật khẩu LẦN CUỐI) ───────
log "Copy public key lên VPS ${VPS_USER}@${VPS_IP}"
printf '\033[1;33m   (Nhập mật khẩu root VPS một lần duy nhất)\033[0m\n'
ssh-copy-id -i "${SSH_KEY_PATH}.pub" -o IdentitiesOnly=yes "${VPS_USER}@${VPS_IP}"

# ── 5. Kiểm tra đăng nhập không mật khẩu ──────────────────────
log "Kiểm tra SSH không mật khẩu"
if ssh -o BatchMode=yes -o ConnectTimeout=10 "${SSH_HOST_ALIAS}" "echo ok" >/dev/null 2>&1; then
  ok "SSH key hoạt động — alias: ${SSH_HOST_ALIAS}"
else
  die "Vẫn chưa đăng nhập được bằng key. Kiểm tra mật khẩu VPS hoặc firewall port 22."
fi

printf '\n'
ok "Cấu hình xong! Từ giờ chạy deploy không cần mật khẩu:"
printf '  ./code/deploy/vps/deploy.sh\n'
printf '  ssh %s\n\n' "${SSH_HOST_ALIAS}"
