import { AUTH_SESSION_COOKIE } from "@/config/auth.config";

// Sessão do usuário autenticado: o token fica no cookie lido pelo `proxy.js`
// (proteção das rotas privadas) e os dados públicos do usuário ficam no
// storage do navegador — `localStorage` quando "Manter conectado" está marcado,
// `sessionStorage` caso contrário.
const USER_STORAGE_KEY = "session_user";
const SESSION_CHANGE_EVENT = "session-change";

let cachedRawUser = null;
let cachedUser = null;

const decodeTokenExpiration = (token) => {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === "number" ? new Date(exp * 1000) : null;
  } catch {
    return null;
  }
};

const notifyChange = () => window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));

export const saveSession = ({ token, user }, { remember = false } = {}) => {
  let cookie = `${AUTH_SESSION_COOKIE}=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
  const expiresAt = remember ? decodeTokenExpiration(token) : null;
  if (expiresAt) cookie += `; expires=${expiresAt.toUTCString()}`;
  document.cookie = cookie;

  const [storage, otherStorage] = remember
    ? [window.localStorage, window.sessionStorage]
    : [window.sessionStorage, window.localStorage];
  otherStorage.removeItem(USER_STORAGE_KEY);
  storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

  notifyChange();
};

// Token JWT da sessão (lido do cookie), enviado ao backend nas rotas protegidas.
export const getSessionToken = () => {
  const prefix = `${AUTH_SESSION_COOKIE}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) || null : null;
};

// Atualiza os dados do usuário no mesmo storage da sessão atual, sem mexer no token.
export const updateSessionUser = (user) => {
  const storage =
    window.sessionStorage.getItem(USER_STORAGE_KEY) !== null
      ? window.sessionStorage
      : window.localStorage;
  storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  notifyChange();
};

export const clearSession = () => {
  document.cookie = `${AUTH_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  window.sessionStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
  notifyChange();
};

// Retorna sempre a mesma referência enquanto o conteúdo salvo não muda
// (exigido pelo `useSyncExternalStore`).
export const getSessionUser = () => {
  const rawUser =
    window.sessionStorage.getItem(USER_STORAGE_KEY) ??
    window.localStorage.getItem(USER_STORAGE_KEY);

  if (rawUser !== cachedRawUser) {
    cachedRawUser = rawUser;
    try {
      cachedUser = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      cachedUser = null;
    }
  }

  return cachedUser;
};

export const subscribeSession = (listener) => {
  window.addEventListener(SESSION_CHANGE_EVENT, listener);
  // Mantém as outras abas sincronizadas (login/logout em outra aba).
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(SESSION_CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
};
