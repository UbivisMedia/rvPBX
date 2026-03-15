import * as service from './asterisk-modules.service.js';

export async function list(req, res, next) {
  try {
    const filter = typeof req.query.filter === 'string' ? req.query.filter.trim() : '';
    const data = await service.listAsteriskModules(filter);
    res.json({
      success: true,
      message: data.connected ? 'Asterisk modules loaded' : 'AMI not connected – no live data',
      data
    });
  } catch (err) {
    next(err);
  }
}

export async function reload(req, res, next) {
  try {
    const { name } = req.params;
    const data = await service.reloadAsteriskModule(name);

    res.json({
      success: data.ok,
      message: data.ok ? `Module '${name}' reloaded` : `Reload failed: ${data.message}`,
      data
    });
  } catch (err) {
    next(err);
  }
}

export async function load(req, res, next) {
  try {
    const { name } = req.params;
    const data = await service.loadAsteriskModule(name);

    res.json({
      success: data.ok,
      message: data.ok ? `Module '${name}' loaded` : `Load failed: ${data.message}`,
      data
    });
  } catch (err) {
    next(err);
  }
}

export async function unload(req, res, next) {
  try {
    const { name } = req.params;
    const data = await service.unloadAsteriskModule(name);

    res.json({
      success: data.ok,
      message: data.ok ? `Module '${name}' unloaded` : `Unload failed: ${data.message}`,
      data
    });
  } catch (err) {
    next(err);
  }
}
