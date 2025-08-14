// This allows us to pass allowed roles dynamically, e.g., checkRole(['admin', 'AE'])
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
      // We assume that the verifyToken middleware has already run
      // and attached the user object (with their role) to the request.
      const userRole = req.user?.role;
  
      if (userRole && allowedRoles.includes(userRole)) {
        // User has one of the allowed roles, proceed to the next middleware or route handler.
        next();
      } else {
        // User does not have the required role, send a "Forbidden" error.
        res.status(403).json({ error: 'Forbidden: You do not have permission to access this resource.' });
      }
    };
  };
  
  module.exports = checkRole;