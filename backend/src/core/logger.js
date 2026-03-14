import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from './config.js';

fs.mkdirSync(config.paths.logDir, { recursive: true });

const prettyConsole = new winston.transports.Console({
  level: config.env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(winston.format.colorize(), winston.format.simple())
});

const rotatingFile = new DailyRotateFile({
  dirname: config.paths.logDir,
  filename: 'api-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  zippedArchive: true,
  level: 'info',
  format: winston.format.json()
});

const errorFile = new winston.transports.File({
  filename: path.join(config.paths.logDir, 'error.log'),
  level: 'error',
  format: winston.format.json()
});

export const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'asterisk-admin-backend' },
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [prettyConsole, rotatingFile, errorFile]
});
