import { render, screen } from "@testing-library/react";
import ProfilePage from "./profile.page";

jest.mock("@/hooks/use-session-user.hook", () => ({
  useSessionUser: () => ({ id: "1", name: "Maria da Silva", email: "maria@example.com" }),
}));

describe("# ProfilePage", () => {
  it("should show the user data and keep the other profile cards hidden", () => {
    render(<ProfilePage />);

    expect(screen.getByRole("heading", { name: "Maria da Silva" })).toBeInTheDocument();
    ["Segurança", "Zona de perigo"].forEach((title) => {
      expect(screen.getByText(title).closest(".hidden")).not.toBeNull();
    });
  });
});
