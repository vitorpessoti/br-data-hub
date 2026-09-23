import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordForm from "./reset-password-form.component";
import apiClient from "@/config/api-client.factory";

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

describe("# ResetPasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should keep the submit button disabled until an email is typed", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should show an error alert and not call the backend when the email is invalid", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByPlaceholderText("Digite seu e-mail"), "not-an-email");
    await user.click(screen.getByRole("button"));

    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("should call the backend and show the generic success message", async () => {
    apiClient.post.mockResolvedValue({ message: "ok" });
    const user = userEvent.setup();

    render(<ResetPasswordForm />);
    await user.type(screen.getByPlaceholderText("Digite seu e-mail"), "user@example.com");
    await user.click(screen.getByRole("button"));

    expect(await screen.findByText("E-mail enviado")).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith("/auth/forgot-password", {
      email: "user@example.com",
    });
  });

  it("should show an error alert with the backend message when the request fails", async () => {
    apiClient.post.mockRejectedValue(new Error("Servidor indisponível."));
    const user = userEvent.setup();

    render(<ResetPasswordForm />);
    await user.type(screen.getByPlaceholderText("Digite seu e-mail"), "user@example.com");
    await user.click(screen.getByRole("button"));

    expect(await screen.findByText("Servidor indisponível.")).toBeInTheDocument();
    expect(screen.queryByText("E-mail enviado")).not.toBeInTheDocument();
  });
});
