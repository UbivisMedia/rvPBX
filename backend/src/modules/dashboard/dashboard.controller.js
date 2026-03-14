import { buildHealthSnapshot } from '../../services/health.service.js';
import { cdrSummary } from '../../services/db.service.js';
import { telemetryService } from '../../services/telemetry.service.js';
import { cdrQuerySchema, alertsQuerySchema } from './dashboard.validator.js';

export function overview(req, res, next) {
  try {
    const { value: cdrQuery, error } = cdrQuerySchema.validate(req.query || {});
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const snapshot = buildHealthSnapshot();
    const dashboard = telemetryService.getDashboardSnapshot(cdrQuery.days);

    res.json({
      success: true,
      message: 'Dashboard data loaded',
      data: {
        health: snapshot,
        ...dashboard
      }
    });
  } catch (err) {
    next(err);
  }
}

export function cdr(req, res, next) {
  try {
    const { value, error } = cdrQuerySchema.validate(req.query || {});
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    res.json({
      success: true,
      message: 'CDR summary loaded',
      data: cdrSummary(value.days)
    });
  } catch (err) {
    next(err);
  }
}

export function alerts(req, res, next) {
  try {
    const { value, error } = alertsQuerySchema.validate(req.query || {});
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    res.json({
      success: true,
      message: 'Alerts loaded',
      data: telemetryService.getAlerts(value.status, value.limit)
    });
  } catch (err) {
    next(err);
  }
}

export function acknowledge(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw Object.assign(new Error('Invalid alert id'), { statusCode: 400 });
    }

    telemetryService.acknowledgeAlert(id);
    res.json({
      success: true,
      message: 'Alert acknowledged',
      data: { id }
    });
  } catch (err) {
    next(err);
  }
}
