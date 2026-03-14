

| Asterisk Admin Frontend *Projektplan · Setup Guide · Entwicklungs-Checkliste* |
| :---: |

| Node.js 22.8.2 LTS | Asterisk 20+ / 22 | Vue 3 \+ Vite | Modulares Design |
| :---: | :---: | :---: | :---: |

*Erstellt: 14\. März 2026*

# **1\. Projektübersicht & Ziele**

Das Asterisk Admin Frontend ist eine vollständige Verwaltungsoberfläche für Asterisk-Telefonserver, die mit Node.js 22.8.2 LTS entwickelt wird. Das System bietet eine moderne, browserbasierte Benutzeroberfläche für VoIP-Administratoren ohne direkten Serverkonsolenzugriff.

| Primäre Ziele | Technische Anforderungen |
| :---- | :---- |
| ▸  SIP-Trunks erstellen, konfigurieren und testen | ▸  Node.js 22.8.2 LTS (aktuellste LTS) |
| ▸  Endpoints (Nebenstellen) vollständig verwalten | ▸  Asterisk AMI & ARI Integration |
| ▸  Anrufgruppen (Ring Groups) elegant konfigurieren | ▸  RESTful API mit automatischer Erkennung |
| ▸  Asterisk-Dienste aus der UI neu starten | ▸  Echtzeit-Updates via WebSocket |
| ▸  Modulare Architektur für einfache Erweiterungen | ▸  PJSIP-Konfiguration schreiben & nachladen |

## **1.1 Systemarchitektur Übersicht**

Das System folgt einer klaren 3-Schichten-Architektur:

| Präsentationsschicht ▸ Vue 3 SPA ▸ Pinia State Store ▸ Axios HTTP Client ▸ Socket.io Client | Anwendungsschicht ▸ Express.js API ▸ Module Router ▸ AMI/ARI Services ▸ Config Writer | Datenschicht ▸ Asterisk (AMI/ARI) ▸ PJSIP Config Files ▸ SQLite (local state) ▸ File System |
| :---- | :---- | :---- |

# **2\. Projektplan & Entwicklungs-Roadmap**

## **Phase 1 — Infrastruktur & Grundgerüst (Woche 1–2)**

| Sprint 1.1: Projekt-Setup & Core |
| :---- |
| ▸  Node.js 22.8.2 Projekt initialisieren (ES Modules \+ TypeScript optional) |
| ▸  Express.js 5.x mit modularem Router-System aufsetzen |
| ▸  Winston Logger mit Rotation & strukturiertem Output konfigurieren |
| ▸  Umgebungsvariablen-Schema mit Joi validieren (.env \+ config.js) |
| ▸  PM2 Ecosystem File für Prozessmanagement erstellen |
| ▸  ESLint \+ Prettier \+ Husky Pre-Commit Hooks einrichten |
| ▸  Vite \+ Vue 3 Frontend-Scaffold initialisieren |
| ▸  Tailwind CSS \+ PrimeVue Komponentenbibliothek integrieren |

| Sprint 1.2: Asterisk Integration |
| :---- |
| ▸  asterisk-manager (AMI) Client als Singleton Service implementieren |
| ▸  ARI Client (asterisk-ari-client) konfigurieren und testen |
| ▸  Verbindungs-Health-Check mit automatischem Reconnect |
| ▸  PJSIP Config-Writer Service (Lesen, Schreiben, Validieren) |
| ▸  Asterisk Module Reload API (pjsip reload, dialplan reload) |
| ▸  WebSocket Server (Socket.io) für Echtzeit-Events |
| ▸  Verbindungsstatus-Dashboard-Widget erstellen |

## **Phase 2 — Kern-Module (Woche 3–5)**

| Sprint 2.1: Trunk Management |
| :---- |
| ▸  Trunk-Liste API: GET /api/trunks (aus pjsip.conf lesen) |
| ▸  Trunk erstellen: POST /api/trunks (Konfiguration schreiben \+ reload) |
| ▸  Trunk aktualisieren: PUT /api/trunks/:id |
| ▸  Trunk löschen: DELETE /api/trunks/:id |
| ▸  Trunk-Test-API: POST /api/trunks/:id/test (OPTIONS-Ping via AMI) |
| ▸  Trunk-Status: GET /api/trunks/:id/status (Registrierungsstatus) |
| ▸  Frontend: Trunk-Übersichtstabelle mit Live-Status-Badges |
| ▸  Frontend: Formular-Wizard für neue Trunks (Schritt-für-Schritt) |
| ▸  Frontend: Test-Dialog mit Echtzeit-Feedback |

| Sprint 2.2: Endpoint Management |
| :---- |
| ▸  Endpoint-Liste: GET /api/endpoints (PJSIP Endpoints aus Config) |
| ▸  Endpoint erstellen: POST /api/endpoints (mit Vorlage-System) |
| ▸  Endpoint-Details: GET /api/endpoints/:id |
| ▸  Endpoint aktualisieren & löschen |
| ▸  Codec-Konfiguration pro Endpoint |
| ▸  Endpoint-Registrierungsstatus via AMI |
| ▸  Voicemail-Integration (optional) |
| ▸  Frontend: Endpoint-Karte mit Status-Indikator |
| ▸  Frontend: Bulk-Import via CSV |
| ▸  Frontend: QR-Code / Provisioning-URL Generator |

| Sprint 2.3: Anrufgruppen (Ring Groups) |
| :---- |
| ▸  Anrufgruppen-Verwaltung via extensions.conf / dialplan |
| ▸  Gruppe erstellen mit Mitglieder-Auswahl (Endpoints) |
| ▸  Ring-Strategien: simultaneous, linear, round-robin, random |
| ▸  Failover-Konfiguration (Timeout → Voicemail / andere Gruppe) |
| ▸  Gruppen-Übersicht mit Drag-and-Drop Mitglieder-Verwaltung |
| ▸  API: GET/POST/PUT/DELETE /api/callgroups |
| ▸  Dialplan-Generator (automatisch aus Gruppenconfig) |
| ▸  Frontend: visueller Gruppen-Editor mit Mitglieder-Pool |
| ▸  Frontend: Anruffluss-Visualisierung |

## **Phase 3 — Admin & Erweiterte Features (Woche 6–7)**

| Sprint 3.1: Server-Management-Modul |
| :---- |
| ▸  Asterisk-Dienst-Status anzeigen (systemd/PM2 Status) |
| ▸  Sanfter Reload: POST /api/server/reload (module reload) |
| ▸  Vollständiger Neustart: POST /api/server/restart (mit Bestätigung) |
| ▸  API-Server-Neustart (Node.js Prozess via PM2) |
| ▸  Echtzeit-Logs Streaming via WebSocket (tail \-f asterisk log) |
| ▸  Asterisk-Version und Modul-Info anzeigen |
| ▸  Konfigurationsbackup vor jedem Neustart |
| ▸  Rollback-Funktion für Konfigurationsänderungen |

| Sprint 3.2: Dashboard & Monitoring |
| :---- |
| ▸  Echtzeit-Dashboard: aktive Anrufe, registrierte Endpoints |
| ▸  Trunk-Registrierungsstatus live |
| ▸  Anrufstatistiken (CDR-Auswertung) |
| ▸  System-Ressourcen (CPU, RAM, Uptime) |
| ▸  Alert-System für kritische Events (Trunk down, etc.) |
| ▸  Aktivitäts-Log im Frontend |

## **Phase 4 — Finalisierung (Woche 8\)**

| Sprint 4: Testing, Security & Deployment |
| :---- |
| ▸  Jest Unit Tests für alle Service-Klassen (\>80% Coverage) |
| ▸  Supertest Integration Tests für alle API-Endpunkte |
| ▸  JWT Authentication mit Refresh-Token Rotation |
| ▸  Rate Limiting, Input-Validierung, CORS absichern |
| ▸  Swagger/OpenAPI Dokumentation auto-generieren |
| ▸  Docker Compose für einfaches Deployment |
| ▸  Nginx Reverse-Proxy Konfiguration |
| ▸  Produktions-Build-Pipeline (Vite Build \+ PM2) |

# **3\. Modulare Architektur & Verzeichnisstruktur**

## **3.1 Projektstruktur**

Jedes Modul ist vollständig eigenständig und kann unabhängig entwickelt, getestet und deployed werden. Neue Module werden durch Ablegen im modules/-Verzeichnis automatisch erkannt.

| Verzeichnis | Typ | Rolle | Enthält |
| :---- | :---- | :---- | :---- |
| **core/** | Modul | **Kerninfrastruktur** | • app.js — Express Setup • config.js — Env & Settings • logger.js — Winston Logger • middleware/ — Auth, CORS, Rate Limiting |
| **modules/** | Modul | **Feature-Module (Hot-Swappable)** | • trunks/ — SIP Trunk Management • endpoints/ — Extension Management • callgroups/ — Ring Group Config • server/ — Asterisk Control • dialplan/ — Dialplan Editor |
| **services/** | Modul | **Shared Services** | • asterisk.service.js — AMI Client • ari.service.js — ARI Client • config-writer.js — PJSIP Writer • reload.service.js — Soft Reload |
| **api/** | Modul | **REST API Layer** | • router.js — Auto-Route Discovery • validators/ — Joi Schemas • responses.js — Std Response Fmt • swagger.js — API Docs |
| **frontend/** | Modul | **UI (Vue 3 \+ Vite)** | • components/ — Shared Components • views/ — Page Components • store/ — Pinia State Mgmt • composables/ — Reusable Logic |

## **3.2 Vollständige Verzeichnisstruktur**

asterisk-admin/

├── backend/

│   ├── src/

│   │   ├── core/

│   │   │   ├── app.js              \# Express App Factory

│   │   │   ├── config.js           \# Konfigurationsschema (Joi)

│   │   │   ├── logger.js           \# Winston Logger

│   │   │   └── middleware/

│   │   │       ├── auth.js         \# JWT Middleware

│   │   │       ├── errorHandler.js

│   │   │       └── rateLimiter.js

│   │   ├── modules/               \# Auto-geladen via module-loader.js

│   │   │   ├── trunks/

│   │   │   │   ├── trunks.routes.js

│   │   │   │   ├── trunks.controller.js

│   │   │   │   ├── trunks.service.js

│   │   │   │   └── trunks.validator.js

│   │   │   ├── endpoints/          \# Gleiche Struktur

│   │   │   ├── callgroups/         \# Gleiche Struktur

│   │   │   ├── server/             \# Restart/Reload Module

│   │   │   └── auth/               \# Login/Token Module

│   │   ├── services/

│   │   │   ├── asterisk.service.js \# AMI Singleton

│   │   │   ├── ari.service.js      \# ARI Client

│   │   │   ├── pjsip-writer.js     \# Konfig schreiben

│   │   │   ├── dialplan-writer.js  \# extensions.conf

│   │   │   └── reload.service.js   \# Reload/Restart

│   │   └── index.js                \# Server Entry Point

│   ├── tests/

│   ├── .env.example

│   └── package.json

├── frontend/

│   ├── src/

│   │   ├── components/             \# Shared UI Components

│   │   ├── views/                  \# Page Components

│   │   │   ├── Dashboard.vue

│   │   │   ├── Trunks.vue

│   │   │   ├── Endpoints.vue

│   │   │   ├── CallGroups.vue

│   │   │   └── ServerControl.vue

│   │   ├── store/                  \# Pinia Stores

│   │   └── composables/            \# Reusable Logic

│   └── package.json

├── docker-compose.yml

└── README.md

## **3.3 Modul-Erweiterungsmuster**

Ein neues Modul wird durch Erstellen eines Verzeichnisses in modules/ mit folgender Mindeststruktur angelegt. Der Module-Loader erkennt es automatisch beim Start:

// modules/mein-modul/mein-modul.routes.js

import { Router } from 'express';

import { MeinModulController } from './mein-modul.controller.js';

const router \= Router();

router.get('/', MeinModulController.list);

router.post('/', MeinModulController.create);

// Pflichtexport für Auto-Discovery

export const prefix \= '/api/mein-modul';  // URL-Prefix

export const name \= 'Mein Modul';          // Anzeigename

export default router;

# **4\. Setup Guide — Schritt für Schritt**

## **4.1 Voraussetzungen prüfen**

| Komponente | Version | Prüfbefehl |
| :---- | :---- | :---- |
| Node.js | v22.8.2 LTS (min.) | node \--version |
| npm | v10.x+ | npm \--version |
| Asterisk | 20 LTS oder 22 | asterisk \-V |
| Git | 2.x+ | git \--version |
| PM2 | Global installiert | pm2 \--version |
| Nginx | Optional (Reverse Proxy) | nginx \-v |

## **4.2 Asterisk vorbereiten**

Folgende Module müssen in Asterisk aktiviert sein:

\# Asterisk CLI

module load res\_pjsip.so

module load res\_pjsip\_session.so

module load res\_ari.so

module load res\_http\_websocket.so

module load cdr\_csv.so

AMI (Asterisk Manager Interface) in /etc/asterisk/manager.conf aktivieren:

\[general\]

enabled \= yes

port \= 5038

bindaddr \= 127.0.0.1

\[asterisk-admin\]

secret \= IHR\_SICHERES\_PASSWORT

deny \= 0.0.0.0/0.0.0.0

permit \= 127.0.0.1/255.255.255.0

read \= system,call,log,verbose,agent,user,config,dtmf,reporting,cdr,dialplan

write \= system,call,agent,user,config,command,reporting,originate,message

ARI in /etc/asterisk/ari.conf konfigurieren:

\[general\]

enabled \= yes

pretty \= yes

\[asterisk-admin-ari\]

type \= user

read\_only \= no

password \= IHR\_ARI\_PASSWORT

password\_format \= plain

## **4.3 Backend Installation**

1. Repository klonen oder Projektstruktur erstellen:

git clone https://github.com/ihr-repo/asterisk-admin.git

cd asterisk-admin/backend

2. Abhängigkeiten installieren:

npm install

3. Umgebungsvariablen konfigurieren:

cp .env.example .env

nano .env

Wichtige .env-Variablen:

\# Server

PORT=3001

NODE\_ENV=production

JWT\_SECRET=sehr-langer-zufaelliger-string-hier

\# Asterisk AMI

ASTERISK\_HOST=127.0.0.1

ASTERISK\_AMI\_PORT=5038

ASTERISK\_AMI\_USER=asterisk-admin

ASTERISK\_AMI\_PASS=IHR\_SICHERES\_PASSWORT

\# Asterisk ARI

ASTERISK\_ARI\_URL=http://127.0.0.1:8088

ASTERISK\_ARI\_USER=asterisk-admin-ari

ASTERISK\_ARI\_PASS=IHR\_ARI\_PASSWORT

\# Konfigurationspfade

ASTERISK\_CONFIG\_PATH=/etc/asterisk

ASTERISK\_LOG\_PATH=/var/log/asterisk

BACKUP\_PATH=/var/backups/asterisk-admin

4. PM2 konfigurieren und starten:

npm install \-g pm2

pm2 start ecosystem.config.js

pm2 save

pm2 startup

## **4.4 Frontend Installation & Build**

cd ../frontend

npm install

\# Development

npm run dev

\# Produktions-Build

npm run build

\# Build-Ausgabe liegt in frontend/dist/

## **4.5 Nginx Reverse-Proxy (Empfohlen)**

server {

    listen 443 ssl;

    server\_name admin.ihre-domain.de;

    \# SSL-Zertifikat (Let's Encrypt empfohlen)

    ssl\_certificate /etc/letsencrypt/live/.../fullchain.pem;

    ssl\_certificate\_key /etc/letsencrypt/live/.../privkey.pem;

    \# Frontend (statische Dateien)

    root /var/www/asterisk-admin/frontend/dist;

    index index.html;

    try\_files $uri $uri/ /index.html;

    \# Backend API Proxy

    location /api/ {

        proxy\_pass http://127.0.0.1:3001;

        proxy\_http\_version 1.1;

        proxy\_set\_header Upgrade $http\_upgrade;

        proxy\_set\_header Connection "upgrade";

        proxy\_set\_header Host $host;

    }

    \# WebSocket Proxy

    location /socket.io/ {

        proxy\_pass http://127.0.0.1:3001;

        proxy\_http\_version 1.1;

        proxy\_set\_header Upgrade $http\_upgrade;

        proxy\_set\_header Connection "upgrade";

    }

}

# **5\. Technologie-Stack & npm-Pakete**

## **5.1 Backend-Abhängigkeiten**

| Paket | Version | Zweck |
| :---- | :---- | :---- |
| express | ^5.0.0 | HTTP Framework (neueste Generation) |
| asterisk-manager | ^1.0.0 | AMI Client für Asterisk |
| node-ari-client | ^2.x | ARI REST Client |
| socket.io | ^4.7.x | WebSocket für Echtzeit-Updates |
| jsonwebtoken | ^9.x | JWT Authentication |
| bcryptjs | ^2.4.x | Passwort-Hashing |
| joi | ^17.x | Input-Validierung & Schemas |
| winston | ^3.x | Strukturiertes Logging |
| winston-daily-rotate-file | ^4.x | Log-Rotation |
| dotenv | ^16.x | Umgebungsvariablen laden |
| cors | ^2.8.x | CORS-Konfiguration |
| helmet | ^7.x | HTTP Security Headers |
| express-rate-limit | ^7.x | Rate Limiting |
| better-sqlite3 | ^9.x | Lokale Datenpersistenz |
| ini | ^4.x | Asterisk .conf Parsing |
| node-cron | ^3.x | Geplante Aufgaben |
| swagger-ui-express | ^5.x | API-Dokumentation UI |

## **5.2 Frontend-Abhängigkeiten**

| Paket | Version | Zweck |
| :---- | :---- | :---- |
| vue | ^3.4.x | Reaktives UI-Framework |
| vite | ^5.x | Build-Tool & Dev-Server |
| pinia | ^2.x | State Management |
| vue-router | ^4.x | Client-seitiges Routing |
| primevue | ^4.x | Enterprise UI-Komponenten |
| tailwindcss | ^3.x | Utility-CSS-Framework |
| axios | ^1.x | HTTP Client |
| socket.io-client | ^4.7.x | WebSocket Client |
| @vueuse/core | ^10.x | Composition API Utilities |
| vue-draggable-plus | ^0.x | Drag-and-Drop für Gruppen |
| chart.js \+ vue-chartjs | ^4.x | Dashboard-Charts |

# **6\. Entwicklungs-Checkliste**

Die folgenden Checklisten decken alle Entwicklungsphasen ab. Abhaken nach Abschluss.

| Phase 1: Infrastruktur |  |
| ----- | :---- |
| **☐** | **Node.js 22.8.2 LTS installiert und verifiziert** *node \--version gibt v22.8.2 aus* |
| **☐** | **Projektstruktur nach Schema erstellt** *Alle Verzeichnisse (core, modules, services, api) vorhanden* |
| **☐** | **package.json mit "type": "module" konfiguriert** *ES Modules aktiviert für Node 22 Kompatibilität* |
| **☐** | **Winston Logger konfiguriert** *Console \+ File Transport, Log-Rotation aktiv* |
| **☐** | **.env.example dokumentiert & .env erstellt** *Alle Pflichtfelder mit Kommentaren versehen* |
| **☐** | **Joi Config-Schema mit Validierung** *App startet nicht mit fehlerhafter Konfiguration* |
| **☐** | **ESLint \+ Prettier konfiguriert** *.eslintrc.js \+ .prettierrc vorhanden* |
| **☐** | **Module-Loader implementiert** *Automatische Erkennung neuer Module in modules/* |
| **☐** | **Express App Factory Pattern** *app.js exportiert createApp() Funktion* |
| **☐** | **Basis-Fehlerbehandlung Middleware** *Globaler Error Handler mit konsistentem Response-Format* |

| Phase 2: Asterisk Integration |  |
| ----- | :---- |
| **☐** | **AMI Verbindung aufgebaut und getestet** *asterisk-manager Singleton verbindet mit AMI* |
| **☐** | **Automatisches Reconnect bei Verbindungsverlust** *Exponentielles Backoff implementiert* |
| **☐** | **ARI Client konfiguriert** *node-ari-client mit Stasis-App registriert* |
| **☐** | **PJSIP Config-Reader implementiert** *pjsip.conf vollständig parsierbar* |
| **☐** | **PJSIP Config-Writer implementiert** *Atomares Schreiben mit Backup vorher* |
| **☐** | **Dialplan Reader/Writer** *extensions.conf Sektionen lesen und schreiben* |
| **☐** | **Reload Service implementiert** *pjsip reload, dialplan reload via AMI* |
| **☐** | **WebSocket Server läuft** *Socket.io Events: connected, ami-event, status-update* |
| **☐** | **Gesundheits-Check Endpoint** *GET /api/health gibt AMI/ARI Status zurück* |

| Phase 3: Trunk-Modul |  |
| ----- | :---- |
| **☐** | **GET /api/trunks — Liste aller Trunks** *Liest aus pjsip.conf, ergänzt Live-Status via AMI* |
| **☐** | **POST /api/trunks — Trunk erstellen** *Schreibt pjsip.conf, führt reload durch* |
| **☐** | **PUT /api/trunks/:id — Trunk aktualisieren** *Validierung, Backup, Schreiben, Reload* |
| **☐** | **DELETE /api/trunks/:id — Trunk löschen** *Mit Bestätigungslogik in Controller* |
| **☐** | **POST /api/trunks/:id/test — Trunk testen** *SIP OPTIONS via AMI, Echtzeit-Feedback* |
| **☐** | **GET /api/trunks/:id/status — Registrierungsstatus** *Live-Status aus AMI PJSIPShowEndpoint* |
| **☐** | **Trunk Formular-Validierung (Joi)** *Alle Pflichtfelder, Format-Checks* |
| **☐** | **Frontend: Trunk-Tabelle mit Live-Status** *Farbige Badges: Registered/Unregistered/Unknown* |
| **☐** | **Frontend: Trunk-Erstellungsformular** *Alle PJSIP-Parameter abgedeckt* |
| **☐** | **Frontend: Test-Dialog mit Echtzeit-Output** *Test-Ergebnis in \<2 Sekunden anzeigen* |

| Phase 4: Endpoint-Modul |  |
| ----- | :---- |
| **☐** | **GET /api/endpoints — Alle Endpoints** *Inkl. Registrierungsstatus und letzter Aktivität* |
| **☐** | **POST /api/endpoints — Endpoint erstellen** *Vorlage-System: SIP-Telefon, Softphone, etc.* |
| **☐** | **PUT /api/endpoints/:id — Aktualisieren** *Codec-Liste, Auth-Daten, Optionen* |
| **☐** | **DELETE /api/endpoints/:id — Löschen** *Prüfung ob Endpoint in Anrufgruppe* |
| **☐** | **Endpoint-Registrierungsstatus live** *AMI Event REGISTRY für Updates nutzen* |
| **☐** | **Codec-Konfiguration pro Endpoint** *allow/deny im PJSIP-Format* |
| **☐** | **Frontend: Endpoint-Kacheln mit Status** *Grün \= registriert, Rot \= offline* |
| **☐** | **Frontend: CSV-Bulk-Import** *Vorlage downloadbar, Validierung vor Import* |
| **☐** | **Frontend: Provisioning-Daten anzeigen** *Server/User/Passwort klar angezeigt* |

| Phase 5: Anrufgruppen-Modul |  |
| ----- | :---- |
| **☐** | **GET /api/callgroups — Alle Gruppen** *Mit Mitgliederliste und Aktiv-Status* |
| **☐** | **POST /api/callgroups — Gruppe erstellen** *Dialplan automatisch generieren* |
| **☐** | **PUT /api/callgroups/:id — Aktualisieren** *Mitglieder-Änderungen sofort übernehmen* |
| **☐** | **DELETE /api/callgroups/:id — Löschen** *Dialplan-Einträge entfernen* |
| **☐** | **Ring-Strategie: simultaneous (alle gleichzeitig)** *Queue/Dial-Befehl im Dialplan* |
| **☐** | **Ring-Strategie: linear (nacheinander)** *Timeout pro Mitglied konfigurierbar* |
| **☐** | **Ring-Strategie: round-robin** *Lastverteilung über Mitglieder* |
| **☐** | **Failover-Konfiguration** *Bei Timeout: Voicemail / andere Gruppe / externe Nummer* |
| **☐** | **Frontend: Drag-and-Drop Gruppen-Editor** *Endpoints ziehen von Pool in Gruppe* |
| **☐** | **Frontend: Anruffluss-Diagramm** *Visuelle Darstellung der Ring-Strategie* |

| Phase 6: Server-Management |  |
| ----- | :---- |
| **☐** | **GET /api/server/status — Dienst-Status** *Asterisk \+ Node-API Status, Uptime, Version* |
| **☐** | **POST /api/server/reload — Sanfter Reload** *Nur PJSIP \+ Dialplan nachladen, kein Unterbruch* |
| **☐** | **POST /api/server/restart — Asterisk-Neustart** *Bestätigungs-Dialog \+ Aktiv-Anruf-Warnung* |
| **☐** | **POST /api/server/api-restart — API-Neustart** *PM2 restart via Child Process* |
| **☐** | **GET /api/server/logs (WebSocket)** *Live-Log-Streaming aus /var/log/asterisk/full* |
| **☐** | **Konfigurations-Backup vor jedem Neustart** *Backup in BACKUP\_PATH mit Timestamp* |
| **☐** | **Rollback-API: POST /api/server/rollback** *Letztes Backup wiederherstellen* |
| **☐** | **Frontend: Server-Kontrollpanel** *Klare Buttons mit Bestätigungsdialogen* |
| **☐** | **Frontend: Live-Log-Viewer** *Scrollendes Log-Fenster mit Filterung* |

| Phase 7: Sicherheit & Qualität |  |
| ----- | :---- |
| **☐** | **JWT Authentication implementiert** *Access Token (15min) \+ Refresh Token (7 Tage)* |
| **☐** | **Passwörter mit bcrypt gehasht** *Salt Rounds: 12* |
| **☐** | **Rate Limiting aktiv** *100 req/15min global, 5 req/15min für Login* |
| **☐** | **Input-Sanitierung überall** *Kein direktes Schreiben von User-Input in Configs* |
| **☐** | **HTTPS erzwungen (Nginx)** *HTTP auf HTTPS redirect, HSTS Header* |
| **☐** | **Helmet.js HTTP-Headers** *CSP, XSS-Protection, NOSNIFF aktiv* |
| **☐** | **CORS konfiguriert** *Nur erlaubte Origins in allowlist* |
| **☐** | **Jest Tests für alle Services** *Coverage \> 80% für kritische Pfade* |
| **☐** | **Integration Tests für alle API-Endpunkte** *Supertest mit Mock-AMI* |
| **☐** | **Swagger-Dokumentation vollständig** *Alle Endpunkte dokumentiert mit Beispielen* |

| Phase 8: Deployment |  |
| ----- | :---- |
| **☐** | **PM2 Ecosystem-Datei konfiguriert** *ecosystem.config.js mit Cluster-Mode* |
| **☐** | **pm2 startup eingerichtet** *Auto-Start nach Server-Reboot* |
| **☐** | **Nginx Reverse-Proxy konfiguriert** *SSL-Termination, WebSocket-Proxy* |
| **☐** | **Let's Encrypt SSL-Zertifikat eingerichtet** *Certbot mit Auto-Renewal* |
| **☐** | **Logrotate für Anwendungslogs** *Täglich rotieren, 30 Tage behalten* |
| **☐** | **Backup-Cron-Job eingerichtet** *Täglich automatisches Konfig-Backup* |
| **☐** | **Monitoring eingerichtet** *PM2 Plus oder Uptime Kuma* |
| **☐** | **Firewall-Regeln für Port 443** *Nur HTTPS öffentlich, AMI/ARI nur lokal* |
| **☐** | **Dokumentation (README.md) aktuell** *Setup, Erweiterung, Troubleshooting* |

# **7\. API Endpunkt Übersicht**

| Methode | Endpunkt | Beschreibung |
| :---- | :---- | :---- |
| **GET** | /api/health | System-Status (AMI, ARI, Version) |
| **GET** | /api/trunks | Alle Trunks mit Live-Status |
| **POST** | /api/trunks | Neuen Trunk erstellen \+ reload |
| **PUT** | /api/trunks/:id | Trunk aktualisieren \+ reload |
| **DELETE** | /api/trunks/:id | Trunk löschen \+ reload |
| **POST** | /api/trunks/:id/test | SIP OPTIONS Test senden |
| **GET** | /api/endpoints | Alle Endpoints mit Reg.-Status |
| **POST** | /api/endpoints | Endpoint erstellen \+ reload |
| **PUT** | /api/endpoints/:id | Endpoint aktualisieren |
| **DELETE** | /api/endpoints/:id | Endpoint löschen |
| **GET** | /api/callgroups | Alle Anrufgruppen |
| **POST** | /api/callgroups | Gruppe erstellen \+ Dialplan generieren |
| **PUT** | /api/callgroups/:id | Gruppe aktualisieren |
| **DELETE** | /api/callgroups/:id | Gruppe löschen \+ Dialplan entfernen |
| **GET** | /api/server/status | Dienststatus \+ Systeminfo |
| **POST** | /api/server/reload | PJSIP \+ Dialplan reload |
| **POST** | /api/server/restart | Asterisk neu starten |
| **POST** | /api/server/api-restart | Node.js API neu starten |
| **GET** | /api/server/backups | Verfügbare Backups auflisten |
| **POST** | /api/server/rollback | Auf Backup zurücksetzen |
| **POST** | /api/auth/login | Login, gibt JWT zurück |
| **POST** | /api/auth/refresh | JWT Token erneuern |
| **GET** | /api/docs | Swagger UI Dokumentation |

## **7.1 Server-Neustart Implementierung**

Der API-Server-Neustart nutzt PM2 für graceful restarts ohne Downtime:

// modules/server/server.controller.js

import { exec } from 'child\_process';

export async function restartApi(req, res) {

  // Antwort senden BEVOR der Prozess neu gestartet wird

  res.json({ success: true, message: 'API-Neustart eingeleitet' });

  // PM2 restart nach kurzer Verzögerung

  setTimeout(() \=\> {

    exec('pm2 restart asterisk-admin-api', (err) \=\> {

      if (err) logger.error('PM2 restart fehlgeschlagen:', err);

    });

  }, 500);

}

Asterisk Admin Frontend — Projektdokumentation  |  Node.js 22.8.2 LTS