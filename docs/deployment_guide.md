# Deployment Guide

## Vollautomatisches Setup (Debian)

Das Script kann alleine laufen und klont das Repo automatisch:

- Repo URL: `https://github.com/UbivisMedia/rvPBX.git`
- Zielpfad: `/opt/rvPBX` (Default)

```bash
curl -fsSL https://raw.githubusercontent.com/UbivisMedia/rvPBX/main/scripts/full_install_debian.sh -o /tmp/full_install_debian.sh
sudo bash /tmp/full_install_debian.sh --domain pbx.example.com
```

Wenn `--install-asterisk` nicht angegeben ist, fragt das Script waehrend der Ausfuehrung interaktiv, ob Asterisk zusaetzlich installiert werden soll.

Mit optionaler Asterisk-Installation:

```bash
# Asterisk aus Debian-Repo
sudo ./scripts/full_install_debian.sh --domain pbx.example.com --install-asterisk apt

# Aktuellste Asterisk-Source von downloads.asterisk.org
sudo ./scripts/full_install_debian.sh --domain pbx.example.com --install-asterisk latest-source
```

Mit automatischem SSL:

```bash
sudo ./scripts/full_install_debian.sh \
  --domain pbx.example.com \
  --install-asterisk latest-source \
  --enable-ssl \
  --ssl-email admin@example.com
```

Optional kannst du Repo URL und Zielpfad anpassen:

```bash
sudo ./scripts/full_install_debian.sh \
  --repo-url https://github.com/UbivisMedia/rvPBX.git \
  --install-dir /opt/rvPBX \
  --domain pbx.example.com
```

Das Script generiert sichere Secrets automatisch und schreibt sie in:

- `backend/.env`
- `backend/.install-secrets.txt`

## PM2 Startup

```bash
cd /var/www/asterisk-admin/backend
npm install
cp .env.example .env
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Nginx Reverse Proxy

- Beispielkonfig: `deploy/nginx/asterisk-admin.conf`
- Aktivieren:

```bash
sudo cp deploy/nginx/asterisk-admin.conf /etc/nginx/sites-available/asterisk-admin.conf
sudo ln -s /etc/nginx/sites-available/asterisk-admin.conf /etc/nginx/sites-enabled/asterisk-admin.conf
sudo nginx -t && sudo systemctl reload nginx
```

## SSL (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d admin.example.com
sudo certbot renew --dry-run
```

## Logrotate

- Vorlage: `deploy/logrotate/asterisk-admin`

```bash
sudo cp deploy/logrotate/asterisk-admin /etc/logrotate.d/asterisk-admin
sudo logrotate -f /etc/logrotate.d/asterisk-admin
```

## Backup Cron

- Cron-Vorlage: `deploy/cron/asterisk-admin-backup`
- Skript: `backend/scripts/backup-configs.mjs`

```bash
crontab -e
# Inhalt aus deploy/cron/asterisk-admin-backup eintragen
```

## Monitoring

- Empfehlung: Uptime Kuma oder PM2 Plus.
- Zu pruefen:
  - `GET /api/health`
  - `GET /api/server/status`
  - WebSocket Verbindung auf `/socket.io/`

## Firewall

Nur Port 443 offen:

```bash
sudo ufw allow 443/tcp
sudo ufw deny 5038/tcp
sudo ufw deny 8088/tcp
sudo ufw enable
```
