import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInForm from "./signin-form.component";
import apiClient from "@/config/api-client.factory";
import { saveSession } from "@/stores/session.store";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock("@/stores/session.store", () => ({
  saveSession: jest.fn(),
}));

const LOGIN_RESPONSE = {
  message: "Login succeeded.",
  tokenType: "Bearer",
  token: "jwt-token",
  user: { id: "1", name: "John Doe", email: "john@example.com" },
};

const fillForm = async (user, { email = "john@example.com", password = "Str0ng!Pass" } = {}) => {
  if (email) await user.type(screen.getByPlaceholderText("info@gmail.com"), email);
  if (password) await user.type(screen.getByPlaceholderText("Digite sua senha"), password);
};

const submit = (user) => user.click(screen.getByRole("button", { name: "Entrar" }));

describe("# SignInForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render only email and password fields, without social login or back link", () => {
    render(<SignInForm />);

    expect(screen.getByPlaceholderText("info@gmail.com")).toHaveAttribute("name", "email");
    expect(screen.getByPlaceholderText("Digite sua senha")).toHaveAttribute("name", "password");

    expect(screen.queryByText(/Sobrenome/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Entrar com Google/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Entrar com X/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Ou$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Voltar para o dashboard/)).not.toBeInTheDocument();
  });

  it("should toggle password visibility", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    const passwordInput = screen.getByPlaceholderText("Digite sua senha");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByTestId("icon-mock"));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByTestId("icon-mock"));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("should show an error alert and not call the backend when the email is invalid", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    await fillForm(user, { email: "not-an-email" });
    await submit(user);

    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("should show an error alert and not call the backend when the password is empty", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    await fillForm(user, { password: "" });
    await submit(user);

    expect(await screen.findByText("Senha obrigatória")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("should log in, save a non-persistent session and redirect to the dashboard", async () => {
    apiClient.post.mockResolvedValue(LOGIN_RESPONSE);
    const user = userEvent.setup();
    render(<SignInForm />);

    await fillForm(user);
    await submit(user);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "john@example.com",
      password: "Str0ng!Pass",
    });
    expect(saveSession).toHaveBeenCalledWith(
      { token: LOGIN_RESPONSE.token, user: LOGIN_RESPONSE.user },
      { remember: false },
    );
  });

  it("should save a persistent session when 'Manter conectado' is checked", async () => {
    apiClient.post.mockResolvedValue(LOGIN_RESPONSE);
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.click(screen.getByRole("checkbox"));
    await fillForm(user);
    await submit(user);

    await waitFor(() =>
      expect(saveSession).toHaveBeenCalledWith(expect.any(Object), { remember: true }),
    );
  });

  it("should show the spinner and disable the form while submitting", async () => {
    let resolveLogin;
    apiClient.post.mockReturnValue(new Promise((resolve) => (resolveLogin = resolve)));
    const user = userEvent.setup();
    render(<SignInForm />);

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText("Entrando...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Entrando/ })).toBeDisabled();
    expect(screen.getByPlaceholderText("info@gmail.com")).toBeDisabled();
    expect(screen.getByPlaceholderText("Digite sua senha")).toBeDisabled();

    resolveLogin(LOGIN_RESPONSE);
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });

  it("should show the backend error in an alert and re-enable the form when the login fails", async () => {
    apiClient.post.mockRejectedValue(new Error("Invalid email or password."));
    const user = userEvent.setup();
    render(<SignInForm />);

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText("Não foi possível entrar")).toBeInTheDocument();
    expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    expect(saveSession).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("should clear the previous alert when submitting again with valid data", async () => {
    apiClient.post.mockResolvedValue(LOGIN_RESPONSE);
    const user = userEvent.setup();
    render(<SignInForm />);

    await fillForm(user, { email: "invalid" });
    await submit(user);
    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("info@gmail.com"));
    await user.type(screen.getByPlaceholderText("info@gmail.com"), "john@example.com");
    await submit(user);

    await waitFor(() => expect(screen.queryByText("E-mail inválido")).not.toBeInTheDocument());
  });
});
