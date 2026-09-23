import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useSessionUser } from "./use-session-user.hook";
import { clearSession, saveSession } from "@/stores/session.store";

const USER = { id: "1", name: "John Doe", email: "john@example.com" };

describe("# useSessionUser", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("should return null when there is no session", () => {
    const { result } = renderHook(() => useSessionUser());

    expect(result.current).toBeNull();
  });

  it("should update when the session is saved and cleared", () => {
    const { result } = renderHook(() => useSessionUser());

    act(() => saveSession({ token: "token", user: USER }));
    expect(result.current).toEqual(USER);

    act(() => clearSession());
    expect(result.current).toBeNull();
  });

  it("should render without a user on the server", () => {
    window.sessionStorage.setItem("session_user", JSON.stringify(USER));

    function Probe() {
      const user = useSessionUser();
      return user ? user.name : "no-user";
    }

    expect(renderToString(<Probe />)).toBe("no-user");
  });
});
