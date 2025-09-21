const checkRole = (allowed = []) => {
  const allowedSet = new Set(
    (Array.isArray(allowed) ? allowed : [allowed])
      .filter(Boolean)
      .map(r => String(r).toLowerCase())
  );

  return (req, res, next) => {
    // Gather user roles from token payload
    const raw = req.user?.roles ?? req.user?.role ?? null;
    let userRoles = [];

    if (Array.isArray(raw)) userRoles = raw;
    else if (typeof raw === 'string') userRoles = raw.split(',').map(s => s.trim());
    else userRoles = [];

    const has = userRoles.some(r => allowedSet.has(String(r).toLowerCase()));

    // Optional debug (dev only)
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[checkRole]', { allowed: [...allowedSet], userRoles });
    }

    if (has) return next();

    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  };
};

module.exports = checkRole;