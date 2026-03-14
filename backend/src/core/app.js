import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { createApiRouter } from '../api/router.js';
import { openApiSpec } from '../api/swagger.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { globalRateLimiter } from './middleware/rate-limiter.js';
import { sanitizeInputMiddleware } from './middleware/sanitize.js';

export async function createApp(context = {}) {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeInputMiddleware);
  app.use(globalRateLimiter);
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    })
  );

  app.get('/', (_req, res) => {
    res.json({ success: true, message: 'Asterisk Admin API is running' });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  const apiRouter = await createApiRouter(context);
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
