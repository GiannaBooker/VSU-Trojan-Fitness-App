export function createAdminMiddleware({ adminKey }) {
  if (!adminKey) {
    return function requireAdmin(_req, res, _next) {
      return res.status(503).json({ error: "Admin key not configured" });
    };
  }

  return function requireAdmin(req, res, next) {
    const provided = req.get("x-admin-key");
    if (provided && provided === adminKey) return next();
    return res.status(403).json({ error: "Forbidden" });
  };
}

