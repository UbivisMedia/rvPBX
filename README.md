# Asterisk Admin Frontend / Backend

Dieses Repository implementiert den Projektplan aus `docs/asterisk_admin_plan.docx.md` als lauffaehiges Full-Stack-System.

## Struktur

- `backend/`: Express 5 API (modular, Auto-Discovery)
- `frontend/`: Vue 3 + Vite SPA
- `docs/`: Projekt-, Deployment- und Troubleshooting-Dokumentation
- `deploy/`: Nginx, Logrotate, Cron Vorlagen

## Kernfunktionen

- Modul-Loader fuer `backend/src/modules/*/*.routes.js`
- JWT Login + Refresh-Token Rotation
- CRUD fuer Trunks, Endpoints, Callgroups
- Trunk-Test mit WebSocket Live-Feedback
- Endpoint CSV Bulk-Import
- Provisioning URL + QR Anzeige
- Dialplan-Strategien: simultaneous, linear, round-robin, random
- Server Reload/Restart/API-Restart, Backup, Rollback
- Dashboard mit:
  - aktive Calls
  - CDR-Auswertung
  - Ressourcen (CPU/RAM/Uptime)
  - Alerts + Acknowledge
- Live-Log-Streaming per WebSocket (`server-log-line`)
- Swagger/OpenAPI unter `/api/docs`

## Schnellstart lokal

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3) Aufruf

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`
- API Doku: `http://localhost:3001/api/docs`

Default Login:

- `admin / admin123` (aus `.env.example`)

## Tests und Qualitaet

### Backend

```bash
cd backend
npm run lint
npm test
```

### Frontend

```bash
cd frontend
npm run build
```

## Docker

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3001`

## Deployment

- Guide: `docs/deployment_guide.md`
- Nginx: `deploy/nginx/asterisk-admin.conf`
- Logrotate: `deploy/logrotate/asterisk-admin`
- Cron Backup: `deploy/cron/asterisk-admin-backup`
- Troubleshooting: `docs/troubleshooting.md`

## Automatischer Full-Install auf Debian

Es gibt ein Script fuer frische Debian-Server:

- `scripts/full_install_debian.sh`

Du brauchst nur dieses Script. Falls kein lokales Repo vorhanden ist, klont es automatisch:

- `https://github.com/UbivisMedia/rvPBX.git`
- Standard-Zielpfad: `/opt/rvPBX`

Beispiele:

```bash
sudo ./scripts/full_install_debian.sh --domain pbx.example.com
sudo ./scripts/full_install_debian.sh --install-asterisk apt --domain pbx.example.com
sudo ./scripts/full_install_debian.sh --install-asterisk latest-source --domain pbx.example.com --enable-ssl --ssl-email admin@example.com
```

Wenn du das Script direkt auf einem frischen Server laden willst:

```bash
curl -fsSL https://raw.githubusercontent.com/UbivisMedia/rvPBX/main/scripts/full_install_debian.sh -o /tmp/full_install_debian.sh
sudo bash /tmp/full_install_debian.sh --domain pbx.example.com
```

Das Script:

- installiert Systemabhaengigkeiten, Node.js 22, PM2, Nginx
- generiert sichere Secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`, AMI/ARI Passwoerter, Admin-Passwort)
- schreibt `backend/.env` automatisch
- baut Frontend und startet Backend per PM2
- konfiguriert Nginx
- installiert optional Asterisk (`apt` oder `latest-source`)
- fragt interaktiv nach Asterisk-Installation, wenn `--install-asterisk` nicht gesetzt ist

Wichtiger Output nach dem Lauf:

- `backend/.install-secrets.txt` mit generierten Zugangsdaten

## Hinweis zur Asterisk-Abnahme

Die Code-Funktionalitaet ist umgesetzt. Die finale fachliche Abnahme fuer AMI/ARI benoetigt ein reales Asterisk 20/22 Zielsystem mit produktiven Credentials.
