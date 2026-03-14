import { callgroupSchema, callgroupUpdateSchema } from './callgroups.validator.js';
import * as service from './callgroups.service.js';

export function list(req, res, next) {
  try {
    const callgroups = service.listCallgroups();
    res.json({ success: true, message: 'Callgroups loaded', data: callgroups });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const { value, error } = callgroupSchema.validate(req.body);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const created = await service.createCallgroup(value);
    res.status(201).json({ success: true, message: 'Callgroup created', data: created });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const { value, error } = callgroupUpdateSchema.validate(req.body);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const updated = await service.updateCallgroup(Number(req.params.id), value);
    res.json({ success: true, message: 'Callgroup updated', data: updated });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const data = await service.deleteCallgroup(Number(req.params.id));
    res.json({ success: true, message: 'Callgroup deleted', data });
  } catch (error) {
    next(error);
  }
}
