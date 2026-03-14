# Troubleshooting

## API startet nicht

1. `backend/.env` pruefen (JWT Secrets muessen gesetzt sein).
2. `node --check src/index.js` ausfuehren.
3. Logs lesen: `backend/runtime/logs/error.log`.

## Login funktioniert nicht

1. Default User aus `.env`: `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
2. Tokens im Browser-Storage loeschen.
3. `POST /api/auth/login` direkt testen.

## Asterisk Status bleibt offline

1. `ASTERISK_ENABLED=true` setzen.
2. AMI/ARI Zugangsdaten pruefen.
3. Auf dem Asterisk-Host:
   - `asterisk -rx "manager show settings"`
   - `asterisk -rx "http show status"`

## Keine Live-Logs im Frontend

1. `ASTERISK_FULL_LOG_FILE` in `.env` setzen.
2. Datei muss existieren und lesbar sein.
3. WebSocket-Verbindung im Browser prüfen (`/socket.io/`).

## CSV-Import fehlschlaegt

1. Header exakt: `extension,displayName,username,password,codecs`.
2. Extension nur numerisch (2-6 Stellen).
3. Bereits vorhandene Extensions verursachen Fehler pro Zeile.
