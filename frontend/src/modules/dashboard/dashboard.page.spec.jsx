import { render, screen } from "@testing-library/react";
import apiClient from "@/config/api-client.factory";
import DashboardPage from "./dashboard.page";

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

describe("# DashboardPage", () => {
  it("should show only the CEP and CNPJ widgets with data from the backend", async () => {
    apiClient.get.mockImplementation((path) =>
      Promise.resolve(
        path === "/cep"
          ? { ceps: [{ id: "1", cep: "01001000", status: "completed" }] }
          : { cnpjs: [{ id: "2", cnpj: "19131243000197", status: "completed" }] },
      ),
    );

    render(<DashboardPage />);

    expect(screen.getByRole("heading", { name: "CEP" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "CNPJ" })).toBeInTheDocument();
    expect(await screen.findByText("01001-000")).toBeInTheDocument();
    expect(await screen.findByText("19.131.243/0001-97")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith("/cep");
    expect(apiClient.get).toHaveBeenCalledWith("/cnpj");
  });
});
