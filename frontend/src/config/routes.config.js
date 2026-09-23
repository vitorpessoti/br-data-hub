// Rotas acessíveis sem autenticação.
export const PUBLIC_ROUTES = {
  signin: "/signin",
  signup: "/signup",
  resetPassword: "/reset-password",
  resetPasswordConfirm: "/reset-password/confirm",
  notFound: "/error-404",
};

// Rotas que exigem usuário autenticado.
export const PRIVATE_ROUTES = {
  dashboard: "/dashboard",
  dataTables: "/data-tables",
  profile: "/profile",
  spinners: "/spinners",
  modals: "/modals",
  alerts: "/alerts",
  badges: "/badges",
  formElements: "/form-elements",
};

export const HOME_ROUTE = PRIVATE_ROUTES.dashboard;

const publicPaths = new Set(Object.values(PUBLIC_ROUTES));
const privatePaths = new Set(Object.values(PRIVATE_ROUTES));

const normalize = (pathname) =>
  pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;

export const isPublicRoute = (pathname) => publicPaths.has(normalize(pathname));

export const isPrivateRoute = (pathname) =>
  privatePaths.has(normalize(pathname));
