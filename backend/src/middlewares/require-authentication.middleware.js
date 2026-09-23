import authenticate from '../modules/auth/auth.middleware.js';

const withoutTrailingSlash = path => (path.length > 1 ? path.replace(/\/+$/, '') : path);

// Requires a valid token on every request except the given public routes ("METHOD /path").
// Unknown routes also answer 401, so unauthenticated users cannot tell which routes exist.
const requireAuthentication = publicRoutes => {
    const allowed = new Set(publicRoutes.map(route => route.toLowerCase()));

    return (req, res, next) => {
        const route = `${req.method} ${withoutTrailingSlash(req.path)}`.toLowerCase();
        if (allowed.has(route)) return next();
        return authenticate(req, res, next);
    };
};

export default requireAuthentication;
