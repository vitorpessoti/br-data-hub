import {
  clearSession,
  getSessionToken,
  getSessionUser,
  saveSession,
  subscribeSession,
  updateSessionUser,
} from "./session.store";

const USER = { id: "1", name: "John Doe", email: "john@example.com" };
const EXPIRATION_SECONDS = 1893456000; // 2030-01-01T00:00:00Z

const toBase64Url = (value) =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const buildToken = (payload) => `header.${toBase64Url(payload)}.signature`;

describe("# session.store", () => {
  let cookieSetter;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    cookieSetter = jest.spyOn(document, "cookie", "set");
  });

  afterEach(() => {
    cookieSetter.mockRestore();
  });

  describe("saveSession", () => {
    it("should write a session cookie and keep the user in sessionStorage by default", () => {
      window.localStorage.setItem("session_user", JSON.stringify({ name: "Old" }));

      saveSession({ token: buildToken({ exp: EXPIRATION_SECONDS }), user: USER });

      const cookie = cookieSetter.mock.calls[0][0];
      expect(cookie).toMatch(/^access_token=header\./);
      expect(cookie).toContain("path=/");
      expect(cookie).not.toContain("expires=");
      expect(JSON.parse(window.sessionStorage.getItem("session_user"))).toEqual(USER);
      expect(window.localStorage.getItem("session_user")).toBeNull();
    });

    it("should persist the user in localStorage and expire the cookie with the token when remembered", () => {
      window.sessionStorage.setItem("session_user", JSON.stringify({ name: "Old" }));

      saveSession(
        { token: buildToken({ exp: EXPIRATION_SECONDS }), user: USER },
        { remember: true },
      );

      expect(cookieSetter.mock.calls[0][0]).toContain(
        `expires=${new Date(EXPIRATION_SECONDS * 1000).toUTCString()}`,
      );
      expect(JSON.parse(window.localStorage.getItem("session_user"))).toEqual(USER);
      expect(window.sessionStorage.getItem("session_user")).toBeNull();
    });

    it.each([
      ["a token without exp", buildToken({ sub: "1" })],
      ["a malformed token", "not-a-jwt"],
    ])("should fall back to a session cookie for %s", (_, token) => {
      saveSession({ token, user: USER }, { remember: true });

      expect(cookieSetter.mock.calls[0][0]).not.toContain("expires=");
      expect(JSON.parse(window.localStorage.getItem("session_user"))).toEqual(USER);
    });

    it("should notify subscribers", () => {
      const listener = jest.fn();
      const unsubscribe = subscribeSession(listener);

      saveSession({ token: "token", user: USER });

      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
    });
  });

  describe("clearSession", () => {
    it("should expire the cookie, remove the stored user and notify subscribers", () => {
      window.localStorage.setItem("session_user", JSON.stringify(USER));
      window.sessionStorage.setItem("session_user", JSON.stringify(USER));
      const listener = jest.fn();
      const unsubscribe = subscribeSession(listener);

      clearSession();

      expect(cookieSetter.mock.calls[0][0]).toMatch(/^access_token=;.*max-age=0/);
      expect(window.localStorage.getItem("session_user")).toBeNull();
      expect(window.sessionStorage.getItem("session_user")).toBeNull();
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
    });
  });

  describe("updateSessionUser", () => {
    it.each([
      ["sessionStorage", () => window.sessionStorage, () => window.localStorage],
      ["localStorage", () => window.localStorage, () => window.sessionStorage],
    ])("should replace the user in %s, keep the cookie and notify subscribers", (_, getStorage, getOtherStorage) => {
      getStorage().setItem("session_user", JSON.stringify(USER));
      const listener = jest.fn();
      const unsubscribe = subscribeSession(listener);

      updateSessionUser({ ...USER, name: "Jane Doe" });

      expect(JSON.parse(getStorage().getItem("session_user"))).toEqual({ ...USER, name: "Jane Doe" });
      expect(getOtherStorage().getItem("session_user")).toBeNull();
      expect(cookieSetter).not.toHaveBeenCalled();
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
    });
  });

  describe("getSessionToken", () => {    let cookieGetter;

    afterEach(() => {
      cookieGetter.mockRestore();
    });

    it.each([
      ["the decoded token of the session cookie", "theme=dark; access_token=a%2Eb.c", "a.b.c"],
      ["null when there is no session cookie", "theme=dark", null],
      ["null when the session cookie is empty", "access_token=", null],
    ])("should return %s", (_, cookie, expected) => {
      cookieGetter = jest.spyOn(document, "cookie", "get").mockReturnValue(cookie);

      expect(getSessionToken()).toBe(expected);
    });
  });

  describe("getSessionUser", () => {
    it("should return null when there is no session", () => {
      expect(getSessionUser()).toBeNull();
    });

    it("should read the user from sessionStorage first and then from localStorage", () => {
      window.localStorage.setItem("session_user", JSON.stringify({ name: "Local" }));
      expect(getSessionUser()).toEqual({ name: "Local" });

      window.sessionStorage.setItem("session_user", JSON.stringify({ name: "Session" }));
      expect(getSessionUser()).toEqual({ name: "Session" });
    });

    it("should return the same reference while the stored value does not change", () => {
      window.sessionStorage.setItem("session_user", JSON.stringify(USER));

      expect(getSessionUser()).toBe(getSessionUser());
    });

    it("should return null when the stored value is not valid JSON", () => {
      window.sessionStorage.setItem("session_user", "{invalid");

      expect(getSessionUser()).toBeNull();
    });
  });

  describe("subscribeSession", () => {
    it("should listen to storage events from other tabs and stop after unsubscribing", () => {
      const listener = jest.fn();
      const unsubscribe = subscribeSession(listener);

      window.dispatchEvent(new Event("storage"));
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("session-change"));
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
