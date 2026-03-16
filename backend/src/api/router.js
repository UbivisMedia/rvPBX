import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Router } from 'express';
import { logger } from '../core/logger.js';
import { authMiddleware } from '../core/middleware/auth.js';

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

async function loadModules(context = {}) {
  const files = await discoverRouteFiles();
  const router = Router();
  const mountedModules = [];

  for (const filePath of files) {
    // Append timestamp to bypass ESM module cache on reload
    const importUrl = `${pathToFileURL(filePath)}?t=${Date.now()}`;
    let imported;

    try {
      imported = await import(importUrl);
    } catch (err) {
      logger.error('Failed to load module', { filePath, error: err.message });
      continue;
    }

    if (!imported.default || !imported.prefix) {
      logger.warn('Skipping module route due to missing exports', { filePath });
      continue;
    }

    const moduleRouter = imported.default;
    const prefix = imported.prefix;
    const name = imported.name || prefix;

    // Inject shared context into each request via middleware
    if (context && Object.keys(context).length > 0) {
      router.use(prefix, (req, _res, next) => {
        req.moduleContext = context;
        next();
      });
    }

    router.use(prefix, moduleRouter);
    mountedModules.push({
      name,
      prefix,
      filePath,
      loadedAt: new Date().toISOString()
    });
  }

  logger.info('Modules mounted', {
    count: mountedModules.length,
    modules: mountedModules.map((entry) => `${entry.name}:${entry.prefix}`)
  });

  return { router, mountedModules };
}

export async function createApiRouter(context = {}) {
  const proxyRouter = Router();

  let { router: innerRouter, mountedModules } = await loadModules(context);

  proxyRouter.get('/modules', (_req, res) => {
    res.json({
      success: true,
      message: 'Mounted modules',
      data: { modules: mountedModules }
    });
  });

  /**
   * POST /api/modules/reload
   * Hot-reload all API modules without process restart.
   * Auth-protected. Module files are re-imported fresh via cache-busted URLs.
   */
  proxyRouter.post('/modules/reload', authMiddleware, async (req, res, next) => {
    try {
      const prevCount = mountedModules.length;
      ({ router: innerRouter, mountedModules } = await loadModules(context));

      logger.info('API modules hot-reloaded', {
        by: req.user?.username,
        count: mountedModules.length,
        prev: prevCount
      });

      res.json({
        success: true,
        message: `Modules reloaded: ${mountedModules.length} active (was ${prevCount})`,
        data: { modules: mountedModules }
      });
    } catch (err) {
      next(err);
    }
  });

  // Delegate all other requests to the dynamically loaded inner router
  proxyRouter.use((req, res, next) => innerRouter(req, res, next));

  return proxyRouter;
}
