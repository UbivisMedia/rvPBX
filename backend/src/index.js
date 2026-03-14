import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './core/app.js';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { asteriskService } from './services/asterisk.service.js';
import { ariService } from './services/ari.service.js';
import { buildHealthSnapshot } from './services/health.service.js';
import { setIo } from './services/socket.service.js';
import { telemetryService } from './services/telemetry.service.js';
import { logStreamService } from './services/log-stream.service.js';

async function bootstrap() {
  await Promise.all([asteriskService.init(), ariService.init()]);

  const app = await createApp();
  const server = http.createServer(app);

  const io = new SocketServer(server, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST']
    }
  });
  setIo(io);
  logStreamService.start();

  io.on('connection', (socket) => {
    socket.emit('status-update', {
      ...buildHealthSnapshot(),
      realtime: telemetryService.getRealtimeMetrics()
    });
    socket.emit('connected', { id: socket.id, at: new Date().toISOString() });
  });

  asteriskService.on('event', (event) => {
    telemetryService.handleAmiEvent(event);
    io.emit('ami-event', event);
  });

  setInterval(() => {
    io.emit('status-update', {
      ...buildHealthSnapshot(),
      realtime: telemetryService.getRealtimeMetrics()
    });
  }, 10_000);

  server.listen(config.port, () => {
    logger.info('API server started', {
      port: config.port,
      env: config.env
    });
  });
}

bootstrap().catch((error) => {
  logger.error('Fatal startup error', { error: error.message, stack: error.stack });
  process.exit(1);
});
