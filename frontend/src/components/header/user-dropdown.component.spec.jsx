import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserDropdown from "./user-dropdown.component";
import { useSessionUser } from "@/hooks/use-session-user.hook";
import { clearSession } from "@/stores/session.store";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/hooks/use-session-user.hook", () => ({
  useSessionUser: jest.fn(),
}));

jest.mock("@/stores/session.store", () => ({
  clearSession: jest.fn(),
}));

const USER = { id: "1", name: "Maria da Silva", email: "maria@example.com" };

describe("# UserDropdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionUser.mockReturnValue(USER);
  });

  it("should show only the first name of the logged user in the topbar, without an avatar", () => {
    render(<UserDropdown />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.queryByText("maria@example.com")).not.toBeInTheDocument();
  });

  it("should show the full name and email in the profile popup and link to the profile page", async () => {
    const user = userEvent.setup();
    render(<UserDropdown />);

    await user.click(screen.getByRole("button", { name: /Maria/ }));

    expect(screen.getByText("Maria da Silva")).toBeInTheDocument();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Editar perfil/ })).toHaveAttribute("href", "/profile");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByText("Configurações da conta")).not.toBeInTheDocument();
    expect(screen.queryByText("Suporte")).not.toBeInTheDocument();
  });

  it("should close the popup when a menu item is clicked", async () => {
    const user = userEvent.setup();
    render(<UserDropdown />);

    await user.click(screen.getByRole("button", { name: /Maria/ }));
    await user.click(screen.getByRole("link", { name: /Editar perfil/ }));

    expect(screen.queryByText("maria@example.com")).not.toBeInTheDocument();
  });

  it("should close the popup when the toggle is clicked again", async () => {
    const user = userEvent.setup();
    render(<UserDropdown />);

    const toggle = screen.getByRole("button", { name: /Maria/ });
    await user.click(toggle);
    await user.click(toggle);

    expect(screen.queryByText("maria@example.com")).not.toBeInTheDocument();
  });

  it("should clear the session and go to the login page when signing out", async () => {
    const user = userEvent.setup();
    render(<UserDropdown />);

    await user.click(screen.getByRole("button", { name: /Maria/ }));
    await user.click(screen.getByRole("button", { name: "Sair" }));

    expect(clearSession).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/signin");
  });

  it("should render without a name or avatar while there is no session user", () => {
    useSessionUser.mockReturnValue(null);
    render(<UserDropdown />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("Maria")).not.toBeInTheDocument();
  });
});
