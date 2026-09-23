import { NextResponse } from "next/server";
import { AUTH_ENABLED, AUTH_SESSION_COOKIE } from "@/config/auth.config";
import {
  HOME_ROUTE,
  PUBLIC_ROUTES,
  isPrivateRoute,
  isPublicRoute,
} from "@/config/routes.config";

const redirectTo = (request, pathname) =>
  NextResponse.redirect(new URL(pathname, request.url));

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const isAuthenticated =
    !AUTH_ENABLED || request.cookies.has(AUTH_SESSION_COOKIE);

  if (pathname === "/") {
    return redirectTo(
      request,
      isAuthenticated ? HOME_ROUTE : PUBLIC_ROUTES.signin,
    );
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (isPrivateRoute(pathname) && isAuthenticated) {
    return NextResponse.next();
  }

  // Rota inexistente ou privada sem sessão: sempre 404, para não revelar
  // quais URLs existem na aplicação.
  return redirectTo(request, PUBLIC_ROUTES.notFound);
}

export const config = {
  matcher: ["/((?!api/|_next|_vercel|.*\\..*).*)"],
};
