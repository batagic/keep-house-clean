#!/usr/bin/env bash
# Deploy một lệnh: Mac → VPS (+ tuỳ chọn push GitHub Pages)
#
#   ./ops/vps/deploy.sh           # Chỉ API lên VPS
#   ./ops/vps/deploy.sh --all     # git push + API lên VPS
#   ./ops/vps/deploy.sh --help
#
# Lần đầu (một lần): ./ops/vps/setup-ssh.sh
#
# Biến môi trường (tuỳ chọn):
#   VPS_HOST=kho-thoc-vps          # alias trong ~/.ssh/config (mặc định)
#   REMOTE_ROOT=/opt/nhatkyvumua
#   API_PUBLIC_URL=https://apinhatkyvumua.taho.cat/kho-thoc/

set -euo pipefail

VPS_HOST="${VPS_HOST:-kho-thoc-vps}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/nhatkyvumua}"
API_PUBLIC_URL="${API_PUBLIC_URL:-https://apinhatkyvumua.taho.cat/kho-thoc/}"
GIT_BRANCH="${GIT_BRANCH:-main}"
DO_GIT_PUSH=0

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_CTL="/tmp/kho-thoc-deploy-%r@%h:%p"
SSH_BASE_OPTS=(
  -o ControlMaster=auto
  -o "ControlPath=${SSH_CTL}"
  -o ControlPersist=120
  -o BatchMode=yes
  -o ConnectTimeout=15
)

usage() {
  cat <<'EOF'
Deploy Kho Thóc — một lệnh từ Mac

  ./ops/vps/deploy.sh           Deploy API lên VPS (rsync + docker rebuild)
  ./ops/vps/deploy.sh --all     Thêm git push origin main (GitHub Pages)

Lần đầu — cấu hình SSH key (một lần, không cần mật khẩu khi deploy):
  ./ops/vps/setup-ssh.sh

Tuỳ chọn:
  VPS_HOST=kho-thoc-vps ./ops/vps/deploy.sh
  VERIFY_PATTERN=delete_profile ./ops/vps/deploy.sh
EOF
}

log()  { printf '\n\033[1;36m→ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✅ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠️  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m❌ %s\033[0m\n' "$*" >&2; exit 1; }

ssh_cmd() {
  ssh "${SSH_BASE_OPTS[@]}" "$VPS_HOST" "$@"
}

rsync_cmd() {
  rsync -az --delete \
    -e "ssh ${SSH_BASE_OPTS[*]}" \
    "$@"
}

cleanup_ssh() {
  ssh -o "ControlPath=${SSH_CTL}" -O exit "$VPS_HOST" 2>/dev/null || true
}

require_ssh_key() {
  if ssh "${SSH_BASE_OPTS[@]}" "$VPS_HOST" true 2>/dev/null; then
    ok "SSH key — ${VPS_HOST}"
    return 0
  fi
  cat >&2 <<EOF

❌ Chưa SSH được ${VPS_HOST} bằng key (không dùng mật khẩu).

Chạy một lần trên Mac:
  ./ops/vps/setup-ssh.sh

Hoặc kiểm tra tay:
  ssh ${VPS_HOST}
  ssh -o BatchMode=yes ${VPS_HOST} echo ok

EOF
  exit 1
}

trap cleanup_ssh EXIT

for arg in "$@"; do
  case "$arg" in
    --all|--push) DO_GIT_PUSH=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Tham số không hợp lệ: $arg (dùng --help)" ;;
  esac
done

cd "$REPO_ROOT"

# ── 0. Kiểm tra SSH key ───────────────────────────────────────
log "Kiểm tra SSH"
require_ssh_key

# ── 1. Git push (tuỳ chọn — GitHub Pages) ─────────────────────
if [[ "$DO_GIT_PUSH" -eq 1 ]]; then
  log "Kiểm tra git trước khi push"
  if [[ -n "$(git status --porcelain)" ]]; then
    warn "Có thay đổi chưa commit — bỏ qua git push (GitHub Pages sẽ không đổi)"
  else
    log "git push origin ${GIT_BRANCH}"
    git push origin "$GIT_BRANCH"
    ok "Đã push — GitHub Pages cập nhật sau ~1–2 phút"
  fi
fi

# ── 2. Mở kết nối SSH ─────────────────────────────────────────
log "Kết nối VPS ${VPS_HOST}"
ssh_cmd "mkdir -p ${REMOTE_ROOT}/repo ${REMOTE_ROOT}/kho-thoc-api/data"

# ── 3. Đồng bộ code ───────────────────────────────────────────
log "Rsync repo → ${REMOTE_ROOT}/repo/"
rsync_cmd \
  --exclude node_modules \
  --exclude .env \
  --exclude '.git/objects' \
  --exclude '.DS_Store' \
  "${REPO_ROOT}/" "${VPS_HOST}:${REMOTE_ROOT}/repo/"

# ── 4. Deploy API trên VPS ────────────────────────────────────
log "Build & restart API trên VPS"
ssh_cmd "env SKIP_GIT_PULL=1 INSTALL_ROOT='${REMOTE_ROOT}' VERIFY_PATTERN='${VERIFY_PATTERN:-}' bash -s" \
  < "${REPO_ROOT}/ops/vps/deploy-api.sh"

# ── 5. Kiểm tra HTTPS từ Mac ───────────────────────────────────
log "Kiểm tra API public"
if curl -sf "${API_PUBLIC_URL}?type=ping" >/dev/null; then
  ok "API HTTPS OK — ${API_PUBLIC_URL}"
else
  warn "HTTPS chưa phản hồi — kiểm tra Nginx/SSL trên VPS"
fi

ok "Deploy xong!"
printf '  API:      %s\n' "${API_PUBLIC_URL}"
printf '  Frontend: https://batagic.github.io/keep-house-clean/code/nhat-ky.html\n'
[[ "$DO_GIT_PUSH" -eq 0 ]] && warn "Chưa push GitHub Pages — chạy lại với --all nếu đổi frontend"
warn "Không chạy import-csv sau deploy — dữ liệu Gạo nằm trong Postgres, không trong repo"
