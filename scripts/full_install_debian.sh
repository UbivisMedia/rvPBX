#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

INSTALL_ASTERISK="none" # none|apt|latest-source
INSTALL_ASTERISK_EXPLICIT="false"
DOMAIN="localhost"
ENABLE_SSL="false"
SSL_EMAIL=""
CONFIGURE_FIREWALL="false"
API_PORT="3001"
PM2_APP_NAME="asterisk-admin-api"
REPO_URL="https://github.com/UbivisMedia/rvPBX.git"
INSTALL_DIR="/opt/rvPBX"
USE_LOCAL_REPO="auto" # auto|true|false

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  echo "[$(timestamp)] [INFO] $*"
}

warn() {
  echo "[$(timestamp)] [WARN] $*" >&2
}

die() {
  echo "[$(timestamp)] [ERROR] $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/full_install_debian.sh [options]

Options:
  --repo-dir <path>               Projektpfad (default: Parent dieses Scripts)
  --install-dir <path>            Zielpfad fuer Auto-Clone (default: /opt/rvPBX)
  --repo-url <url>                Git URL fuer Auto-Clone (default: UbivisMedia/rvPBX)
  --use-local-repo                Lokales Repo erzwingen (kein Auto-Clone)
  --domain <fqdn>                 Domain fuer Nginx/CORS (default: localhost)
  --api-port <port>               Backend Port (default: 3001)
  --install-asterisk <mode>       none | apt | latest-source (wenn nicht gesetzt: interaktive Abfrage)
  --enable-ssl                    Let's Encrypt via certbot aktivieren
  --ssl-email <mail>              E-Mail fuer certbot (Pflicht mit --enable-ssl)
  --configure-firewall            UFW Regeln setzen (OpenSSH, 80, optional 443)
  --help                          Hilfe anzeigen

Beispiele:
  sudo ./scripts/full_install_debian.sh --domain pbx.example.com
  sudo ./scripts/full_install_debian.sh --install-dir /opt/rvPBX --repo-url https://github.com/UbivisMedia/rvPBX.git --domain pbx.example.com
  sudo ./scripts/full_install_debian.sh --install-asterisk apt --domain pbx.example.com
  sudo ./scripts/full_install_debian.sh --install-asterisk latest-source --domain pbx.example.com --enable-ssl --ssl-email admin@example.com
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-dir)
      REPO_DIR="${2:?Missing value for --repo-dir}"
      shift 2
      ;;
    --install-dir)
      INSTALL_DIR="${2:?Missing value for --install-dir}"
      shift 2
      ;;
    --repo-url)
      REPO_URL="${2:?Missing value for --repo-url}"
      shift 2
      ;;
    --use-local-repo)
      USE_LOCAL_REPO="true"
      shift
      ;;
    --domain)
      DOMAIN="${2:?Missing value for --domain}"
      shift 2
      ;;
    --api-port)
      API_PORT="${2:?Missing value for --api-port}"
      shift 2
      ;;
    --install-asterisk)
      INSTALL_ASTERISK="${2:?Missing value for --install-asterisk}"
      INSTALL_ASTERISK_EXPLICIT="true"
      shift 2
      ;;
    --enable-ssl)
      ENABLE_SSL="true"
      shift
      ;;
    --ssl-email)
      SSL_EMAIL="${2:?Missing value for --ssl-email}"
      shift 2
      ;;
    --configure-firewall)
      CONFIGURE_FIREWALL="true"
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1 (use --help)"
      ;;
  esac
done

if [[ "${INSTALL_ASTERISK}" != "none" && "${INSTALL_ASTERISK}" != "apt" && "${INSTALL_ASTERISK}" != "latest-source" ]]; then
  die "--install-asterisk must be one of: none, apt, latest-source"
fi

if [[ "${ENABLE_SSL}" == "true" ]]; then
  if [[ "${DOMAIN}" == "localhost" ]]; then
    die "--enable-ssl requires a real domain (not localhost)"
  fi
  if [[ -z "${SSL_EMAIL}" ]]; then
    die "--enable-ssl requires --ssl-email <mail>"
  fi
fi

if [[ "$(id -u)" -ne 0 ]]; then
  die "Please run as root (sudo)."
fi

if [[ ! -f /etc/os-release ]]; then
  die "Cannot detect OS (missing /etc/os-release)."
fi

# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID}" != "debian" && "${ID_LIKE:-}" != *"debian"* ]]; then
  die "This installer supports Debian-compatible systems only."
fi

if [[ "${USE_LOCAL_REPO}" != "auto" && "${USE_LOCAL_REPO}" != "true" && "${USE_LOCAL_REPO}" != "false" ]]; then
  die "Invalid USE_LOCAL_REPO mode: ${USE_LOCAL_REPO}"
fi

export DEBIAN_FRONTEND=noninteractive

has_project_layout() {
  local dir="$1"
  [[ -d "${dir}/backend" && -d "${dir}/frontend" ]]
}

install_base_packages() {
  log "Installing base packages"
  apt-get update -y
  apt-get install -y \
    ca-certificates \
    curl \
    wget \
    gnupg \
    lsb-release \
    git \
    jq \
    unzip \
    openssl \
    build-essential \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx \
    python3 \
    python3-pip \
    libsqlite3-dev \
    libssl-dev \
    libffi-dev
}

ensure_repo() {
  local local_repo_available="false"

  if has_project_layout "${REPO_DIR}"; then
    local_repo_available="true"
  fi

  if [[ "${USE_LOCAL_REPO}" == "true" ]]; then
    if [[ "${local_repo_available}" != "true" ]]; then
      die "--use-local-repo gesetzt, aber kein gueltiges Repo in ${REPO_DIR}"
    fi
    log "Using local repository in ${REPO_DIR}"
    return
  fi

  if [[ "${USE_LOCAL_REPO}" == "auto" && "${local_repo_available}" == "true" ]]; then
    log "Using local repository in ${REPO_DIR}"
    return
  fi

  REPO_DIR="${INSTALL_DIR}"
  log "Preparing repository in ${REPO_DIR}"

  if [[ -d "${REPO_DIR}/.git" ]]; then
    log "Repository exists, updating from origin"
    git -C "${REPO_DIR}" fetch --all --prune
    if git -C "${REPO_DIR}" rev-parse --verify origin/main >/dev/null 2>&1; then
      git -C "${REPO_DIR}" checkout -q main || true
      git -C "${REPO_DIR}" pull --ff-only origin main || warn "Could not fast-forward pull main; keeping current state"
    else
      git -C "${REPO_DIR}" pull --ff-only || warn "Could not fast-forward pull; keeping current state"
    fi
  else
    if [[ -d "${REPO_DIR}" ]]; then
      if [[ -n "$(ls -A "${REPO_DIR}" 2>/dev/null || true)" ]]; then
        die "Install dir ${REPO_DIR} exists and is not empty. Use empty dir or --use-local-repo."
      fi
    else
      mkdir -p "${REPO_DIR}"
    fi
    log "Cloning ${REPO_URL} into ${REPO_DIR}"
    git clone --depth 1 "${REPO_URL}" "${REPO_DIR}"
  fi

  if ! has_project_layout "${REPO_DIR}"; then
    die "Cloned directory does not contain expected backend/frontend structure: ${REPO_DIR}"
  fi
}

prompt_asterisk_install() {
  if [[ "${INSTALL_ASTERISK_EXPLICIT}" == "true" ]]; then
    log "Asterisk mode set via CLI: ${INSTALL_ASTERISK}"
    return
  fi

  if [[ ! -t 0 ]]; then
    warn "No interactive TTY detected; skipping Asterisk prompt (mode=${INSTALL_ASTERISK})."
    warn "Set --install-asterisk apt|latest-source|none for non-interactive runs."
    return
  fi

  echo
  echo "Asterisk Zusatzinstallation"
  echo "1) Nein (keine Asterisk Installation)"
  echo "2) Ja, per apt Paket"
  echo "3) Ja, aktuellste Source von downloads.asterisk.org"
  echo

  local choice=""
  while true; do
    read -r -p "Auswahl [1-3] (Default 1): " choice
    case "${choice:-1}" in
      1)
        INSTALL_ASTERISK="none"
        break
        ;;
      2)
        INSTALL_ASTERISK="apt"
        break
        ;;
      3)
        INSTALL_ASTERISK="latest-source"
        break
        ;;
      *)
        echo "Bitte 1, 2 oder 3 eingeben."
        ;;
    esac
  done

  log "Asterisk mode selected interactively: ${INSTALL_ASTERISK}"
}

install_node_22() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
    if [[ "${major}" == "22" ]]; then
      log "Node.js 22 already installed: $(node -v)"
      return
    fi
    warn "Node.js version $(node -v) found, installing Node.js 22"
  fi

  log "Installing Node.js 22"
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
}

install_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    log "PM2 already installed: $(pm2 -v)"
    return
  fi

  log "Installing PM2 globally"
  npm install -g pm2
}

install_asterisk_apt() {
  log "Installing Asterisk from Debian repositories"
  apt-get install -y asterisk
  systemctl enable --now asterisk || true
}

install_asterisk_latest_source() {
  log "Installing Asterisk latest source release from official downloads"
  # Additional build dependencies for Asterisk source compilation
  # (wget, libssl-dev, libsqlite3-dev already installed by install_base_packages)
  apt-get install -y \
    subversion \
    libxml2-dev \
    libncurses5-dev \
    uuid-dev \
    libjansson-dev \
    libedit-dev

  local latest_tarball
  latest_tarball="$(
    curl -fsSL https://downloads.asterisk.org/pub/telephony/asterisk/ \
      | grep -Eo 'asterisk-[0-9]+\.[0-9]+\.[0-9]+\.tar\.gz' \
      | sort -Vu \
      | tail -n1
  )"

  if [[ -z "${latest_tarball}" ]]; then
    die "Could not determine latest Asterisk tarball from official downloads."
  fi

  local workdir="/usr/local/src"
  local tarball_url="https://downloads.asterisk.org/pub/telephony/asterisk/${latest_tarball}"
  local src_dir="${workdir}/${latest_tarball%.tar.gz}"

  log "Latest Asterisk tarball: ${latest_tarball}"
  cd "${workdir}"
  curl -fL -o "${latest_tarball}" "${tarball_url}"
  rm -rf "${src_dir}"
  tar -xzf "${latest_tarball}"
  cd "${src_dir}"

  ./configure
  make -j"$(nproc)"
  make install
  make samples
  make config
  /sbin/ldconfig
  systemctl enable --now asterisk || true
}

configure_asterisk_for_admin() {
  local ami_user="$1"
  local ami_pass="$2"
  local ari_user="$3"
  local ari_pass="$4"

  if [[ "${INSTALL_ASTERISK}" == "none" ]]; then
    return
  fi

  log "Configuring Asterisk AMI/ARI users for asterisk-admin"
  mkdir -p /etc/asterisk

  for conf in manager.conf ari.conf http.conf; do
    if [[ -f "/etc/asterisk/${conf}" ]]; then
      cp "/etc/asterisk/${conf}" "/etc/asterisk/${conf}.bak.$(date +%Y%m%d%H%M%S)"
    fi
  done

  cat > /etc/asterisk/manager.conf <<EOF
[general]
enabled = yes
webenabled = yes
port = 5038
bindaddr = 127.0.0.1

[${ami_user}]
secret = ${ami_pass}
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,agent,user,config,command,reporting,originate,message
EOF

  cat > /etc/asterisk/ari.conf <<EOF
[general]
enabled = yes
pretty = yes

[${ari_user}]
type = user
read_only = no
password = ${ari_pass}
password_format = plain
EOF

  cat > /etc/asterisk/http.conf <<'EOF'
[general]
enabled = yes
bindaddr = 127.0.0.1
bindport = 8088
EOF

  systemctl restart asterisk || true
}

generate_secret() {
  local length="${1:-64}"
  openssl rand -base64 256 | tr -dc 'A-Za-z0-9' | head -c "${length}"
  echo
}

write_backend_env() {
  local jwt_secret="$1"
  local jwt_refresh_secret="$2"
  local admin_password="$3"
  local ami_user="$4"
  local ami_pass="$5"
  local ari_user="$6"
  local ari_pass="$7"

  local cors_origin
  local public_base
  local asterisk_enabled="false"
  local asterisk_config_path="${REPO_DIR}/backend/runtime/asterisk"
  local asterisk_full_log_file="${REPO_DIR}/backend/runtime/logs/asterisk-full.log"

  if [[ "${ENABLE_SSL}" == "true" ]]; then
    public_base="https://${DOMAIN}"
    cors_origin="${public_base}"
  elif [[ "${DOMAIN}" == "localhost" ]]; then
    public_base="http://localhost"
    cors_origin="http://localhost"
  else
    public_base="http://${DOMAIN}"
    cors_origin="${public_base}"
  fi

  if [[ "${INSTALL_ASTERISK}" != "none" ]]; then
    asterisk_enabled="true"
    asterisk_config_path="/etc/asterisk"
    asterisk_full_log_file="/var/log/asterisk/full"
  fi

  mkdir -p "${REPO_DIR}/backend/runtime/data" \
    "${REPO_DIR}/backend/runtime/logs" \
    "${REPO_DIR}/backend/runtime/asterisk" \
    "${REPO_DIR}/backend/runtime/backups"
  touch "${REPO_DIR}/backend/runtime/logs/asterisk-full.log"
  mkdir -p /var/backups/asterisk-admin

  cat > "${REPO_DIR}/backend/.env" <<EOF
# Server
PORT=${API_PORT}
NODE_ENV=production
CORS_ORIGIN=${cors_origin}
JWT_SECRET=${jwt_secret}
JWT_REFRESH_SECRET=${jwt_refresh_secret}
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=7

# Bootstrap admin user
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${admin_password}

# Asterisk connectivity
ASTERISK_ENABLED=${asterisk_enabled}
ASTERISK_HOST=127.0.0.1
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=${ami_user}
ASTERISK_AMI_PASS=${ami_pass}
ASTERISK_ARI_URL=http://127.0.0.1:8088
ASTERISK_ARI_USER=${ari_user}
ASTERISK_ARI_PASS=${ari_pass}

# Paths
DATA_DIR=${REPO_DIR}/backend/runtime/data
LOG_DIR=${REPO_DIR}/backend/runtime/logs
ASTERISK_CONFIG_PATH=${asterisk_config_path}
ASTERISK_FULL_LOG_FILE=${asterisk_full_log_file}
PJSIP_MANAGED_FILE=pjsip_admin_generated.conf
DIALPLAN_MANAGED_FILE=extensions_admin_generated.conf
BACKUP_PATH=/var/backups/asterisk-admin

# PM2
PM2_PROCESS_NAME=${PM2_APP_NAME}

# Frontend provisioning display
PROVISIONING_BASE_URL=${public_base}/api/provisioning
EOF

  chmod 600 "${REPO_DIR}/backend/.env"
}

install_app_dependencies() {
  log "Installing backend dependencies"
  cd "${REPO_DIR}/backend"
  npm ci

  log "Installing frontend dependencies"
  cd "${REPO_DIR}/frontend"
  npm ci

  log "Building frontend"
  npm run build
}

configure_nginx() {
  local server_name="${DOMAIN}"
  local nginx_conf="/etc/nginx/sites-available/asterisk-admin.conf"

  if [[ "${DOMAIN}" == "localhost" ]]; then
    server_name="_"
  fi

  log "Configuring Nginx"
  cat > "${nginx_conf}" <<EOF
server {
    listen 80;
    server_name ${server_name};

    root ${REPO_DIR}/frontend/dist;
    index index.html;
    try_files \$uri \$uri/ /index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

  ln -sfn "${nginx_conf}" /etc/nginx/sites-enabled/asterisk-admin.conf
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
}

configure_ssl() {
  if [[ "${ENABLE_SSL}" != "true" ]]; then
    return
  fi

  log "Requesting Let's Encrypt certificate for ${DOMAIN}"
  certbot --nginx --non-interactive --agree-tos -m "${SSL_EMAIL}" -d "${DOMAIN}" --redirect
}

configure_logrotate() {
  local src="${REPO_DIR}/deploy/logrotate/asterisk-admin"
  if [[ -f "${src}" ]]; then
    log "Installing logrotate config"
    cp "${src}" /etc/logrotate.d/asterisk-admin
  fi
}

configure_backup_cron() {
  log "Configuring daily backup cron"
  local cron_line
  cron_line="15 2 * * * cd ${REPO_DIR}/backend && /usr/bin/node ./scripts/backup-configs.mjs >> /var/log/asterisk-admin-backup.log 2>&1"
  (
    crontab -l 2>/dev/null | grep -Fv 'backup-configs.mjs' || true
    echo "${cron_line}"
  ) | crontab -
}

start_backend_pm2() {
  log "Starting backend with PM2"
  cd "${REPO_DIR}"
  pm2 delete "${PM2_APP_NAME}" >/dev/null 2>&1 || true
  pm2 start backend/ecosystem.config.cjs --env production
  pm2 save
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
}

configure_firewall() {
  if [[ "${CONFIGURE_FIREWALL}" != "true" ]]; then
    return
  fi

  log "Configuring UFW firewall"
  ufw allow OpenSSH
  ufw allow 80/tcp
  if [[ "${ENABLE_SSL}" == "true" ]]; then
    ufw allow 443/tcp
  fi
  ufw deny 5038/tcp || true
  ufw deny 8088/tcp || true
  ufw --force enable
}

write_secrets_summary() {
  local admin_password="$1"
  local jwt_secret="$2"
  local jwt_refresh_secret="$3"
  local ami_user="$4"
  local ami_pass="$5"
  local ari_user="$6"
  local ari_pass="$7"

  local output_file="${REPO_DIR}/backend/.install-secrets.txt"
  cat > "${output_file}" <<EOF
Created: $(date -Iseconds)
Domain: ${DOMAIN}
Repo: ${REPO_DIR}

Admin user:
  username: admin
  password: ${admin_password}

JWT:
  JWT_SECRET: ${jwt_secret}
  JWT_REFRESH_SECRET: ${jwt_refresh_secret}

Asterisk:
  ASTERISK_AMI_USER: ${ami_user}
  ASTERISK_AMI_PASS: ${ami_pass}
  ASTERISK_ARI_USER: ${ari_user}
  ASTERISK_ARI_PASS: ${ari_pass}
EOF
  chmod 600 "${output_file}"
  echo "${output_file}"
}

main() {
  log "Starting Debian full install"
  log "Initial repo hint: ${REPO_DIR}"
  log "Domain: ${DOMAIN}"

  install_base_packages
  ensure_repo
  prompt_asterisk_install
  log "Asterisk mode: ${INSTALL_ASTERISK}"
  log "Using repo: ${REPO_DIR}"
  install_node_22
  install_pm2

  if [[ "${INSTALL_ASTERISK}" == "apt" ]]; then
    install_asterisk_apt
  elif [[ "${INSTALL_ASTERISK}" == "latest-source" ]]; then
    install_asterisk_latest_source
  fi

  local jwt_secret
  local jwt_refresh_secret
  local admin_password
  local ami_user
  local ami_pass
  local ari_user
  local ari_pass

  jwt_secret="$(generate_secret 96)"
  jwt_refresh_secret="$(generate_secret 96)"
  admin_password="$(generate_secret 24)"
  ami_user="asterisk-admin"
  ami_pass="$(generate_secret 32)"
  ari_user="asterisk-admin-ari"
  ari_pass="$(generate_secret 32)"

  configure_asterisk_for_admin "${ami_user}" "${ami_pass}" "${ari_user}" "${ari_pass}"
  write_backend_env "${jwt_secret}" "${jwt_refresh_secret}" "${admin_password}" "${ami_user}" "${ami_pass}" "${ari_user}" "${ari_pass}"
  install_app_dependencies
  configure_nginx
  configure_ssl
  configure_logrotate
  configure_backup_cron
  start_backend_pm2
  configure_firewall

  local secrets_file
  secrets_file="$(write_secrets_summary "${admin_password}" "${jwt_secret}" "${jwt_refresh_secret}" "${ami_user}" "${ami_pass}" "${ari_user}" "${ari_pass}")"

  log "Install finished successfully"
  echo
  echo "Frontend URL: http://${DOMAIN}"
  if [[ "${ENABLE_SSL}" == "true" ]]; then
    echo "Frontend URL (SSL): https://${DOMAIN}"
  fi
  echo "Backend API: http://127.0.0.1:${API_PORT}"
  echo "API Docs: http://127.0.0.1:${API_PORT}/api/docs"
  echo "Secrets file: ${secrets_file}"
}

main "$@"
