# Deployment Guide

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
