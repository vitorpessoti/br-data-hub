// Com AUTH_ENABLED=false a proteção das rotas privadas fica desligada e todas as
// páginas ficam abertas para navegação (apenas para desenvolvimento).
export const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";

// Cookie que identifica a sessão do usuário autenticado. Gravado pelo
// `session.store.js` no navegador e lido pelo `proxy.js` no servidor, por isso
// aceita também a variante NEXT_PUBLIC_ (única visível no navegador).
export const AUTH_SESSION_COOKIE =
  process.env.NEXT_PUBLIC_AUTH_SESSION_COOKIE ||
  process.env.AUTH_SESSION_COOKIE ||
  "access_token";
