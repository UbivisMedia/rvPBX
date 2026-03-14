import { endpointSchema, endpointUpdateSchema, endpointCsvImportSchema } from './endpoints.validator.js';
import * as service from './endpoints.service.js';

export function list(req, res, next) {
  try {
    const endpoints = service.listEndpoints();
    res.json({ success: true, message: 'Endpoints loaded', data: endpoints });
  } catch (error) {
    next(error);
  }
}

export function details(req, res, next) {
  try {
    const endpoint = service.getEndpoint(Number(req.params.id));
    res.json({ success: true, message: 'Endpoint loaded', data: endpoint });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const { value, error } = endpointSchema.validate(req.body);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const created = await service.createEndpoint(value);
    res.status(201).json({ success: true, message: 'Endpoint created', data: created });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const { value, error } = endpointUpdateSchema.validate(req.body);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const updated = await service.updateEndpoint(Number(req.params.id), value);
    res.json({ success: true, message: 'Endpoint updated', data: updated });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const data = await service.deleteEndpoint(Number(req.params.id));
    res.json({ success: true, message: 'Endpoint deleted', data });
  } catch (error) {
    next(error);
  }
}

export async function status(req, res, next) {
  try {
    const data = await service.endpointStatus(Number(req.params.id));
    res.json({ success: true, message: 'Endpoint status loaded', data });
  } catch (error) {
    next(error);
  }
}

export async function importCsv(req, res, next) {
  try {
    const { value, error } = endpointCsvImportSchema.validate(req.body);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const result = await service.importEndpointsCsv(value.rows);
    res.json({
      success: true,
      message: 'CSV import finished',
      data: result
    });
  } catch (err) {
    next(err);
  }
}
