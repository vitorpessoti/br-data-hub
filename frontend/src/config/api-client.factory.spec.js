const ORIGINAL_ENV = process.env.NEXT_PUBLIC_API_BASE_URL;

jest.mock("@/stores/session.store", () => ({
  clearSession: jest.fn(),
  getSessionToken: jest.fn(() => null),
}));

jest.mock("@/utils/navigation.util", () => ({
  redirectTo: jest.fn(),
}));

async function loadApiClient(baseUrl) {
  jest.resetModules();
  if (baseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = baseUrl;
  }
  const { default: apiClient } = await import("./api-client.factory");
  return apiClient;
}

// Módulos mockados recarregados junto com o apiClient (após o resetModules).
async function loadMocks() {
  const session = await import("@/stores/session.store");
  const navigation = await import("@/utils/navigation.util");
  return { ...session, ...navigation };
}

describe("# api-client.factory", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it("should default the base URL when NEXT_PUBLIC_API_BASE_URL is not set", async () => {
    const apiClient = await loadApiClient(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    });

    await apiClient.get("/status");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/status",
      expect.any(Object),
    );
  });

  it("should use NEXT_PUBLIC_API_BASE_URL when configured", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    });

    await apiClient.get("/status");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/status",
      expect.any(Object),
    );
  });

  it("should send a JSON body on POST and return the parsed response", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "created" }),
    });

    const result = await apiClient.post("/auth/register", { email: "a@b.com" });

    expect(global.fetch).toHaveBeenCalledWith("https://api.example.com/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
    expect(result).toEqual({ message: "created" });
  });

  it("should send a JSON body on PATCH", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "updated" }),
    });

    await apiClient.patch("/auth/users/1", { name: "New name" });

    expect(global.fetch).toHaveBeenCalledWith("https://api.example.com/v1/auth/users/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New name" }),
    });
  });

  it("should omit the body when none is provided", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await apiClient.get("/status");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/status",
      expect.objectContaining({ body: undefined }),
    );
  });

  it("should throw the backend's `error` message when the response is not ok", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Invalid credentials." }),
    });

    await expect(apiClient.post("/auth/login", {})).rejects.toThrow("Invalid credentials.");
  });

  it("should throw the first `errors` entry when the response is not ok and has no `error`", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ errors: ["Email is invalid.", "Password is required."] }),
    });

    await expect(apiClient.post("/auth/register", {})).rejects.toThrow("Email is invalid.");
  });

  it("should throw a generic message when the response body has neither `error` nor `errors`", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => null,
    });

    await expect(apiClient.post("/auth/register", {})).rejects.toThrow(
      "Ocorreu um erro inesperado. Tente novamente.",
    );
  });

  it("should throw a generic message when the error response body cannot be parsed", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("invalid json");
      },
    });

    await expect(apiClient.post("/auth/register", {})).rejects.toThrow(
      "Ocorreu um erro inesperado. Tente novamente.",
    );
  });

  it("should send DELETE requests without a body", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "deleted" }),
    });

    const result = await apiClient.delete("/cep/01001000");

    expect(global.fetch).toHaveBeenCalledWith("https://api.example.com/v1/cep/01001000", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: undefined,
    });
    expect(result).toEqual({ message: "deleted" });
  });

  it("should send the session token as a Bearer Authorization header", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    const { getSessionToken } = await loadMocks();
    getSessionToken.mockReturnValue("jwt-token");
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    await apiClient.get("/cep");

    expect(global.fetch).toHaveBeenCalledWith("https://api.example.com/v1/cep", {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: "Bearer jwt-token" },
      body: undefined,
    });
  });

  it("should end the session and go to the sign-in page on 401 from a protected route", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    const { getSessionToken, clearSession, redirectTo } = await loadMocks();
    getSessionToken.mockReturnValue("expired-token");
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Token expired." }),
    });

    await expect(apiClient.get("/cep")).rejects.toThrow("Token expired.");
    expect(clearSession).toHaveBeenCalled();
    expect(redirectTo).toHaveBeenCalledWith("/signin");
  });

  it.each([
    ["there is no session token", null, "/cep"],
    ["the route is an auth route", "old-token", "/auth/login"],
  ])("should keep the session on 401 when %s", async (_, token, path) => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    const { getSessionToken, clearSession, redirectTo } = await loadMocks();
    getSessionToken.mockReturnValue(token);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid email or password." }),
    });

    await expect(apiClient.post(path, {})).rejects.toThrow("Invalid email or password.");
    expect(clearSession).not.toHaveBeenCalled();
    expect(redirectTo).not.toHaveBeenCalled();
  });

  it("should throw a network error message when fetch rejects", async () => {
    const apiClient = await loadApiClient("https://api.example.com/v1");
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    await expect(apiClient.post("/auth/register", {})).rejects.toThrow(
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    );
  });
});
