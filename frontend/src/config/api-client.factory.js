import { PUBLIC_ROUTES } from "@/config/routes.config";
import { clearSession, getSessionToken } from "@/stores/session.store";
import { redirectTo } from "@/utils/navigation.util";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

const GENERIC_ERROR_MESSAGE = "Ocorreu um erro inesperado. Tente novamente.";
const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";

// Token inválido ou expirado numa rota protegida: encerra a sessão e volta ao login.
const handleExpiredSession = () => {
  clearSession();
  redirectTo(PUBLIC_ROUTES.signin);
};

async function request(path, { method = "GET", body } = {}) {
  const token = getSessionToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token && !path.startsWith("/auth/")) {
      handleExpiredSession();
    }
    const message = data?.error || data?.errors?.[0] || GENERIC_ERROR_MESSAGE;
    throw new Error(message);
  }

  return data;
}

const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export default apiClient;
