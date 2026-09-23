import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignUpForm from "./signup-form.component";
import apiClient from "@/config/api-client.factory";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const fillForm = async (user, { name = "John Doe", email = "john@example.com", password = "Str0ng!Pass" } = {}) => {
  await user.type(screen.getByPlaceholderText("Digite seu nome"), name);
  await user.type(screen.getByPlaceholderText("Digite seu e-mail"), email);
  await user.type(screen.getByPlaceholderText("Digite sua senha"), password);
};

describe("# SignUpForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render only name, email and password fields", () => {
    render(<SignUpForm />);

    expect(screen.getByPlaceholderText("Digite seu nome")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Digite seu e-mail")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Digite sua senha")).toBeInTheDocument();

    expect(screen.queryByText(/Sobrenome/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cadastrar com Google/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cadastrar com X/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Política de Privacidade/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Voltar para o dashboard/)).not.toBeInTheDocument();
  });

  it("should toggle password visibility", async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    const passwordInput = screen.getByPlaceholderText("Digite sua senha");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByTestId("icon-mock"));
    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("should show an error alert and not call the backend when the email is invalid", async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await fillForm(user, { email: "not-an-email" });
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("should show an error alert and not call the backend when the password is weak", async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await fillForm(user, { password: "weak" });
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Senha fraca")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("should register the user and redirect to signin after a successful submit", async () => {
    jest.useFakeTimers();
    apiClient.post.mockResolvedValue({ message: "ok" });
    const user = userEvent.setup({ delay: null });

    render(<SignUpForm />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
        name: "John Doe",
        email: "john@example.com",
        password: "Str0ng!Pass",
      }),
    );

    expect(await screen.findByText("Cadastro realizado")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(pushMock).toHaveBeenCalledWith("/signin");
    jest.useRealTimers();
  });

  it("should show an error alert with the backend message when registration fails", async () => {
    apiClient.post.mockRejectedValue(new Error("Email is already in use."));
    const user = userEvent.setup();

    render(<SignUpForm />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Email is already in use.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar" })).not.toBeDisabled();
  });
});
