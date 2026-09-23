import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordConfirmForm from "./reset-password-confirm-form.component";
import apiClient from "@/config/api-client.factory";

const pushMock = jest.fn();
let searchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParams,
}));

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const fillPasswords = async (user, { password = "Str0ng!Pass", confirmPassword = "Str0ng!Pass" } = {}) => {
  await user.type(screen.getByPlaceholderText("Digite sua nova senha"), password);
  await user.type(screen.getByPlaceholderText("Confirme sua nova senha"), confirmPassword);
};

describe("# ResetPasswordConfirmForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchParams = new URLSearchParams({ token: "valid-token" });
  });

  it("should show an error and not call the backend when there is no token in the URL", async () => {
    searchParams = new URLSearchParams();
    const user = userEvent.setup();
    render(<ResetPasswordConfirmForm />);

    await fillPasswords(user);
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByText("Link inválido")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("should show an error and not call the backend when the password is weak", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordConfirmForm />);

    await fillPasswords(user, { password: "weak", confirmPassword: "weak" });
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByText("Senha fraca")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("should show an error and not call the backend when the passwords do not match", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordConfirmForm />);

    await fillPasswords(user, { password: "Str0ng!Pass", confirmPassword: "Different1!" });
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByText("As senhas não coincidem")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("should toggle password visibility for both fields", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordConfirmForm />);

    const passwordInput = screen.getByPlaceholderText("Digite sua nova senha");
    const confirmInput = screen.getByPlaceholderText("Confirme sua nova senha");
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmInput).toHaveAttribute("type", "password");

    const [, eyeIcon] = screen.getAllByTestId("icon-mock");
    await user.click(eyeIcon);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(confirmInput).toHaveAttribute("type", "text");
  });

  it("should reset the password and redirect to signin on success", async () => {
    jest.useFakeTimers();
    apiClient.post.mockResolvedValue({ message: "ok" });
    const user = userEvent.setup({ delay: null });

    render(<ResetPasswordConfirmForm />);
    await fillPasswords(user);
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByText("Senha redefinida")).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith("/auth/reset-password", {
      token: "valid-token",
      password: "Str0ng!Pass",
    });
    expect(screen.queryByRole("button", { name: "Redefinir senha" })).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(pushMock).toHaveBeenCalledWith("/signin");
    jest.useRealTimers();
  });

  it("should show an error alert with the backend message when the request fails", async () => {
    apiClient.post.mockRejectedValue(new Error("O token de redefinição é inválido ou expirou."));
    const user = userEvent.setup();

    render(<ResetPasswordConfirmForm />);
    await fillPasswords(user);
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(
      await screen.findByText("O token de redefinição é inválido ou expirou."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redefinir senha" })).not.toBeDisabled();
  });
});
