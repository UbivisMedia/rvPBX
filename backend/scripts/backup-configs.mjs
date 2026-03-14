import { createBackup } from '../src/services/backup.service.js';
import { logger } from '../src/core/logger.js';

try {
  const backup = createBackup();
  logger.info('Scheduled backup created', backup);
  console.log(`Backup erstellt: ${backup.name}`);
} catch (error) {
  logger.error('Scheduled backup failed', { error: error.message });
  console.error(error.message);
  process.exit(1);
}
