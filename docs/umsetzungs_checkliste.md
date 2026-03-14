# Umsetzungs-Checkliste zum Plan

Stand: 2026-03-14  
Basis: `docs/asterisk_admin_plan.docx.md` + aktueller Code-Stand im Repository

Legende:
- `[x]` fertig
- `[~]` fertig im Code, produktive Abnahme auf echtem Asterisk noch offen
- `[ ]` offen

## Phase 1 - Infrastruktur und Grundgeruest

### Sprint 1.1 Projekt-Setup und Core
- [x] Node.js Projekt mit ES Modules (`type: module`)
- [x] Express 5 mit modularem Router-System
- [x] Winston Logger mit Rotation
- [x] `.env`-Schema mit Joi-Validierung
- [x] PM2 Ecosystem File
- [x] ESLint + Prettier
- [x] Vite + Vue 3 Frontend Scaffold
- [x] Tailwind CSS + PrimeVue integriert

### Sprint 1.2 Asterisk Integration
- [~] AMI Client als Singleton Service mit Reconnect
- [~] ARI Client angebunden
- [x] Verbindungs-Health-Check (`GET /api/health`)
- [x] PJSIP Config Writer
- [x] Reload Service (`pjsip reload`, `dialplan reload`)
- [x] Socket.io fuer Echtzeit-Events
- [x] Verbindungsstatus im Dashboard

## Phase 2 - Kern-Module

### Sprint 2.1 Trunk Management
- [x] `GET /api/trunks`
- [x] `POST /api/trunks`
- [x] `PUT /api/trunks/:id`
- [x] `DELETE /api/trunks/:id`
- [x] `POST /api/trunks/:id/test`
- [x] `GET /api/trunks/:id/status`
- [x] Backend-Validierung (Joi)
- [x] Frontend Trunk-Tabelle mit Status-Badges
- [x] Trunk-Wizard (Schritt-fuer-Schritt)
- [x] Test-Dialog mit Live-Feedback via WebSocket

### Sprint 2.2 Endpoint Management
- [x] `GET /api/endpoints`
- [x] `POST /api/endpoints`
- [x] `GET /api/endpoints/:id`
- [x] `PUT /api/endpoints/:id`
- [x] `DELETE /api/endpoints/:id`
- [x] Endpoint-Status API (`GET /api/endpoints/:id/status`)
- [x] Codec-Konfiguration pro Endpoint
- [x] Voicemail-Integration (Felder + Dialplan)
- [x] Frontend Endpoint-Kartenansicht mit Status
- [x] CSV Bulk-Import
- [x] Provisioning URL + QR Anzeige

### Sprint 2.3 Callgroups
- [x] `GET/POST/PUT/DELETE /api/callgroups`
- [x] Dialplan-Generator
- [x] Strategien: `simultaneous`, `linear`, `round-robin`, `random`
- [x] Failover-Konfiguration
- [x] Frontend Drag-and-Drop Gruppen-Editor
- [x] Frontend Anruffluss-Visualisierung

## Phase 3 - Admin und erweiterte Features

### Sprint 3.1 Server Management
- [x] `GET /api/server/status`
- [x] `POST /api/server/reload`
- [x] `POST /api/server/restart` (mit confirm-Flag)
- [x] `POST /api/server/api-restart` (PM2)
- [x] Live-Log-Streaming via WebSocket (`server-log-line`)
- [x] Asterisk-/Systeminfo in Status-Endpunkt
- [x] Konfig-Backup vor Reload/Restart
- [x] Rollback API (`POST /api/server/rollback`)
- [x] Frontend Server Control Panel
- [x] Frontend Live-Log-Viewer mit Filterung

### Sprint 3.2 Dashboard und Monitoring
- [x] Echtzeit-Dashboard (Status + Objektzahlen)
- [x] Aktive Anrufe (Realtime-Metrik)
- [x] Trunk-/Endpoint-Reg-Status live aggregiert
- [x] CDR Statistiken
- [x] Ressourcen-Monitoring (CPU, RAM, Uptime)
- [x] Alert-System (Dashboard + Acknowledge)
- [x] Aktivitaets-Log im Frontend

## Phase 4 - Finalisierung (Testing, Security, Deployment)

- [x] Jest + Supertest Integrationstests erweitert
- [x] JWT Auth mit Refresh-Token Rotation
- [x] Passwort-Hashing mit bcrypt (12 Rounds)
- [x] Rate Limiting (global + login)
- [x] Input-Sanitizing + Validierung in Kernmodulen
- [x] Helmet Header aktiv
- [x] CORS Allowlist aktiv
- [x] Swagger/OpenAPI (`/api/docs`)
- [x] Docker Compose vorhanden
- [x] Nginx Reverse Proxy Konfiguration als Datei
- [x] CI Pipeline (`.github/workflows/ci.yml`)

## Deployment-Checkliste (Plan Abschnitt 8)

- [x] PM2 Ecosystem-Datei
- [x] PM2 Startup-Schritte dokumentiert (`docs/deployment_guide.md`)
- [x] SSL/Let's Encrypt Schritte dokumentiert (`docs/deployment_guide.md`)
- [x] Logrotate Vorlage (`deploy/logrotate/asterisk-admin`)
- [x] Backup-Cron Vorlage (`deploy/cron/asterisk-admin-backup`)
- [x] Monitoring-Hinweise dokumentiert
- [x] Firewall-Regeln dokumentiert
- [x] Troubleshooting-Doku (`docs/troubleshooting.md`)

## Restoffen fuer finale Abnahme

- [~] End-to-End Abnahme gegen echten Asterisk 20/22 mit produktiven AMI/ARI-Credentials.
