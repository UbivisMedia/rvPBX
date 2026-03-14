import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Router } from 'express';
import { logger } from '../core/logger.js';

const modulesRoot = path.resolve(process.cwd(), 'src/modules');

async function discoverRouteFiles() {
  const entries = await fs.readdir(modulesRoot, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const moduleDir = path.join(modulesRoot, entry.name);
    const moduleFiles = await fs.readdir(moduleDir, { withFileTypes: true });
    const routeFile = moduleFiles.find((file) => file.isFile() && file.name.endsWith('.routes.js'));

    if (routeFile) {
      files.push(path.join(moduleDir, routeFile.name));
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

export async function createApiRouter(context = {}) {
  const router = Router();
  const files = await discoverRouteFiles();
  const mountedModules = [];

  for (const filePath of files) {
    const imported = await import(pathToFileURL(filePath));

    if (!imported.default || !imported.prefix) {
      logger.warn('Skipping module route due to missing exports', { filePath });
      continue;
    }

    const moduleRouter = imported.default;
    const prefix = imported.prefix;
    const name = imported.name || prefix;

    moduleRouter.locals = context;
    router.use(prefix, moduleRouter);
    mountedModules.push({ name, prefix, filePath });
  }

  router.get('/modules', (_req, res) => {
    res.json({
      success: true,
      message: 'Mounted modules',
      data: {
        modules: mountedModules
      }
    });
  });

  logger.info('Modules mounted', {
    count: mountedModules.length,
    modules: mountedModules.map((entry) => `${entry.name}:${entry.prefix}`)
  });

  return router;
}
