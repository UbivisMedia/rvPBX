import fs from 'node:fs';
import path from 'node:path';
import { config } from '../core/config.js';

const managedFiles = [
  () => path.join(config.asterisk.configPath, config.asterisk.pjsipManagedFile),
  () => path.join(config.asterisk.configPath, config.asterisk.dialplanManagedFile)
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function createBackup() {
  fs.mkdirSync(config.paths.backupDir, { recursive: true });
  const folderName = timestamp();
  const backupDir = path.join(config.paths.backupDir, folderName);
  fs.mkdirSync(backupDir, { recursive: true });

  for (const resolver of managedFiles) {
    const sourcePath = resolver();

    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    const fileName = path.basename(sourcePath);
    fs.copyFileSync(sourcePath, path.join(backupDir, fileName));
  }

  return {
    name: folderName,
    path: backupDir,
    createdAt: new Date().toISOString()
  };
}

export function listBackups() {
  if (!fs.existsSync(config.paths.backupDir)) {
    return [];
  }

  return fs
    .readdirSync(config.paths.backupDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const fullPath = path.join(config.paths.backupDir, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        name: entry.name,
        path: fullPath,
        createdAt: stat.birthtime.toISOString()
      };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
}

export function rollbackBackup(name) {
  const sourceDir = path.join(config.paths.backupDir, name);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Backup not found: ${name}`);
  }

  fs.mkdirSync(config.asterisk.configPath, { recursive: true });

  const files = fs.readdirSync(sourceDir);
  for (const file of files) {
    const source = path.join(sourceDir, file);
    const target = path.join(config.asterisk.configPath, file);
    fs.copyFileSync(source, target);
  }

  return {
    restored: files,
    from: sourceDir
  };
}
