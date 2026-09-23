import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserMetaCard from "./user-meta-card.component";
import apiClient from "@/config/api-client.factory";
import { useSessionUser } from "@/hooks/use-session-user.hook";
import { updateSessionUser } from "@/stores/session.store";

jest.mock("@/hooks/use-session-user.hook", () => ({
  useSessionUser: jest.fn(),
}));

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { patch: jest.fn() },
}));

jest.mock("@/stores/session.store", () => ({
  updateSessionUser: jest.fn(),
}));

const USER = { id: "1", name: "Maria da Silva", email: "maria@example.com" };

// Campos ainda inexistentes no cadastro ficam no markup, porém ocultos.
const isHidden = (element) => element.closest(".hidden") !== null;

const openEditModal = async (user) => {
  await user.click(screen.getByRole("button", { name: /Editar/ }));
};

describe("# UserMetaCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionUser.mockReturnValue(USER);
  });

  it("should show the real name and email of the logged user without an avatar", () => {
    render(<UserMetaCard />);

    expect(screen.getByRole("heading", { name: "Maria da Silva" })).toBeInTheDocument();
    expect(screen.getByText("Nome completo")).toBeInTheDocument();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("should keep the fields the user registration does not have yet hidden", () => {
    render(<UserMetaCard />);

    ["Sobrenome", "Telefone", "Bio", "Redes sociais"].forEach((label) => {
      expect(isHidden(screen.getByText(label))).toBe(true);
    });
    expect(isHidden(screen.getByText("Nome completo"))).toBe(false);
    expect(isHidden(screen.getByText("E-mail"))).toBe(false);
  });

  it("should open the edit modal with the real name and a locked email and close it", async () => {
    const user = userEvent.setup();
    render(<UserMetaCard />);

    await openEditModal(user);

    expect(screen.getByLabelText("Nome completo")).toHaveValue("Maria da Silva");
    expect(screen.getByLabelText("Nome completo")).toBeEnabled();
    expect(screen.getByLabelText("E-mail")).toHaveValue("maria@example.com");
    expect(screen.getByLabelText("E-mail")).toBeDisabled();
    expect(isHidden(screen.getByText("Alterar foto de perfil"))).toBe(true);

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
  });

  it("should send only the name to the backend, update the session and show a success alert", async () => {
    const updatedUser = { ...USER, name: "Maria Souza" };
    apiClient.patch.mockResolvedValue({ user: updatedUser });
    const user = userEvent.setup();
    render(<UserMetaCard />);

    await openEditModal(user);
    await user.clear(screen.getByLabelText("Nome completo"));
    await user.type(screen.getByLabelText("Nome completo"), "  Maria Souza ");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(apiClient.patch).toHaveBeenCalledWith("/auth/users/1", { name: "Maria Souza" });
    expect(updateSessionUser).toHaveBeenCalledWith(updatedUser);
    expect(await screen.findByText("Perfil atualizado")).toBeInTheDocument();
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
  });

  it("should keep the modal open and show an error alert when the backend fails", async () => {
    apiClient.patch.mockRejectedValue(new Error("Could not update the user."));
    const user = userEvent.setup();
    render(<UserMetaCard />);

    await openEditModal(user);
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Não foi possível salvar as alterações")).toBeInTheDocument();
    expect(screen.getByText("Could not update the user.")).toBeInTheDocument();
    expect(updateSessionUser).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByText("Não foi possível salvar as alterações")).not.toBeInTheDocument();
  });

  it("should not close the modal while the changes are being saved", async () => {
    let resolvePatch;
    apiClient.patch.mockReturnValue(new Promise((resolve) => (resolvePatch = resolve)));
    const user = userEvent.setup();
    render(<UserMetaCard />);

    await openEditModal(user);
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(screen.getByText("Salvando...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeDisabled();

    await user.keyboard("{Escape}");
    expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();

    resolvePatch({ user: USER });
    expect(await screen.findByText("Perfil atualizado")).toBeInTheDocument();
  });

  it("should not call the backend when the name is empty", async () => {
    const user = userEvent.setup();
    render(<UserMetaCard />);

    await openEditModal(user);
    await user.clear(screen.getByLabelText("Nome completo"));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(screen.getByText("Nome obrigatório")).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("should render empty values while there is no session user", () => {
    useSessionUser.mockReturnValue(null);
    render(<UserMetaCard />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("maria@example.com")).not.toBeInTheDocument();
  });
});
