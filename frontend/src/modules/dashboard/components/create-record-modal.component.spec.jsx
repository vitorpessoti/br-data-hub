import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import apiClient from "@/config/api-client.factory";
import { RECORD_RESOURCES } from "@/modules/dashboard/config/record-resources.config";
import CreateRecordModal from "./create-record-modal.component";

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const renderModal = (props) =>
  render(
    <CreateRecordModal
      resource={RECORD_RESOURCES.cnpj}
      isOpen
      onClose={jest.fn()}
      onCreated={jest.fn()}
      {...props}
    />,
  );

describe("# CreateRecordModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render nothing when closed", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole("heading", { name: "Novo CNPJ" })).not.toBeInTheDocument();
  });

  it("should keep Cadastrar disabled until the CNPJ is complete", async () => {
    const user = userEvent.setup();
    renderModal();

    const input = screen.getByLabelText("CNPJ");
    expect(input).toHaveAttribute("placeholder", "00.000.000/0000-00");
    await user.type(input, "1913124300");
    expect(input).toHaveValue("19.131.243/00");
    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeDisabled();

    fireEvent.submit(input.closest("form"));
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("should send the raw CNPJ (also alphanumeric) and hand back the response", async () => {
    const user = userEvent.setup();
    const onCreated = jest.fn();
    const response = { message: "saved", cnpj: { id: "1", cnpj: "12ABC34501DE35" } };
    apiClient.post.mockResolvedValue(response);
    renderModal({ onCreated });

    await user.type(screen.getByLabelText("CNPJ"), "12abc34501de35");
    expect(screen.getByLabelText("CNPJ")).toHaveValue("12.ABC.345/01DE-35");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(apiClient.post).toHaveBeenCalledWith("/cnpj", { cnpj: "12ABC34501DE35" });
    expect(onCreated).toHaveBeenCalledWith(response);
  });

  it("should show the spinner while saving and an error alert when it fails", async () => {
    const user = userEvent.setup();
    let rejectRequest;
    apiClient.post.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject;
      }),
    );
    renderModal();

    await user.type(screen.getByLabelText("CNPJ"), "19131243000197");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(screen.getByText("Cadastrando...")).toBeInTheDocument();
    expect(screen.getByLabelText("CNPJ")).toBeDisabled();

    rejectRequest(new Error("CNPJ was not found on BrasilAPI."));

    expect(await screen.findByText("Não foi possível cadastrar o CNPJ")).toBeInTheDocument();
    expect(screen.getByText("CNPJ was not found on BrasilAPI.")).toBeInTheDocument();
    expect(screen.getByLabelText("CNPJ")).not.toBeDisabled();
  });

  it("should close on Cancelar", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ onClose });

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalled();
  });
});
