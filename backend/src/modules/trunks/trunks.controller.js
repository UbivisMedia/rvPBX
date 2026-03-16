import { trunkSchema, trunkUpdateSchema } from './trunks.validator.js';
import * as service from './trunks.service.js';

export function list(req, res, next) {
  try {
    const trunks = service.listTrunks();
    res.json({ success: true, message: 'Trunks loaded', data: trunks });
  } catch (error) {
    next(error);
  }
}

export function details(req, res, next) {
  try {
    const trunk = service.getTrunkById(Number(req.params.id));
    res.json({ success: true, message: 'Trunk loaded', data: trunk });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const { value, error } = trunkSchema.validate(req.body);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const created = await service.createTrunk(value);
    res.status(201).json({ success: true, message: 'Trunk created', data: created });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const { value, error } = trunkUpdateSchema.validate(req.body);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const updated = await service.updateTrunk(Number(req.params.id), value);
    res.json({ success: true, message: 'Trunk updated', data: updated });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const data = await service.deleteTrunk(Number(req.params.id));
    res.json({ success: true, message: 'Trunk deleted', data });
  } catch (error) {
    next(error);
  }
}

export async function test(req, res, next) {
  try {
    const data = await service.testTrunk(Number(req.params.id));
    res.json({ success: true, message: 'Trunk test finished', data });
  } catch (error) {
    next(error);
  }
}

export async function status(req, res, next) {
  try {
    const data = await service.trunkStatus(Number(req.params.id));
    res.json({ success: true, message: 'Trunk status loaded', data });
  } catch (error) {
    next(error);
  }
}
