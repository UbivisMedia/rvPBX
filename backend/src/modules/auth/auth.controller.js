import { loginSchema, refreshSchema } from './auth.validator.js';
import * as authService from './auth.service.js';

export async function login(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const payload = await authService.login(value.username, value.password);
    res.json({ success: true, message: 'Login successful', data: payload });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const { value, error } = refreshSchema.validate(req.body);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const payload = authService.refresh(value.refreshToken);
    res.json({ success: true, message: 'Token refreshed', data: payload });
  } catch (error) {
    next(error);
  }
}
