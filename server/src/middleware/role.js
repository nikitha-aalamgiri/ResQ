/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles - Array of permitted roles (e.g. 'responder', 'admin')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.profile) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before verifying role permissions'
      });
    }

    const currentRole = req.profile.role || req.user.role || 'citizen';

    if (!allowedRoles.includes(currentRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Route requires one of [${allowedRoles.join(', ')}]. Your current role is '${currentRole}'.`,
        required_roles: allowedRoles,
        user_role: currentRole
      });
    }

    next();
  };
};

export default requireRole;
