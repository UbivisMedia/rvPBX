function sanitizeString(value) {
  return String(value)
    .replace(/\u0000/g, '')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}

function sanitizeObject(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeObject(entry));
  }

  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = sanitizeObject(entry);
    }
    return result;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  return value;
}

export function sanitizeInputMiddleware(req, _res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    const sanitizedQuery = sanitizeObject(req.query);
    for (const key of Object.keys(req.query)) {
      delete req.query[key];
    }
    Object.assign(req.query, sanitizedQuery);
  }

  next();
}

export { sanitizeString };
