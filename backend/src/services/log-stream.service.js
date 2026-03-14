import fs from 'node:fs';
import path from 'node:path';
import { config } from '../core/config.js';
import { emitSocket } from './socket.service.js';

class LogStreamService {
  constructor() {
    this.timer = null;
    this.position = 0;
    this.logFile = path.resolve(config.asterisk.fullLogFile);
  }

  ensureLogFile() {
    const dir = path.dirname(this.logFile);
    fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, '', 'utf8');
    }
  }

  readAppendedLines() {
    this.ensureLogFile();
    const stat = fs.statSync(this.logFile);

    if (stat.size < this.position) {
      this.position = 0;
    }

    if (stat.size === this.position) {
      return [];
    }

    const fd = fs.openSync(this.logFile, 'r');
    const length = stat.size - this.position;
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, this.position);
    fs.closeSync(fd);

    this.position = stat.size;
    return buffer
      .toString('utf8')
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);
  }

  start() {
    if (this.timer) {
      return;
    }

    this.ensureLogFile();
    this.position = fs.statSync(this.logFile).size;

    this.timer = setInterval(() => {
      const lines = this.readAppendedLines();
      for (const line of lines) {
        emitSocket('server-log-line', {
          line,
          at: new Date().toISOString()
        });
      }
    }, 1500);
  }

  stop() {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }
}

export const logStreamService = new LogStreamService();
