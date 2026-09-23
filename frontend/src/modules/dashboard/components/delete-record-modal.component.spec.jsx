import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import apiClient from "@/config/api-client.factory";
import { RECORD_RESOURCES } from "@/modules/dashboard/config/record-resources.config";
import DeleteRecordModal from "./delete-record-modal.component";

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { delete: jest.fn() },
}));

const RECORD = { id: "cnpj-1", cnpj: "12ABC34501DE35" };

const renderModal = (props) =>
  render(
    <DeleteRecordModal
      resource={RECORD_RESOURCES.cnpj}
      record={RECORD}
      onClose={jest.fn()}
      onDeleted={jest.fn()}
      {...props}
    />,
  );

describe("# DeleteRecordModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render nothing without a record", () => {
    renderModal({ record: null });

    expect(screen.queryByText("Excluir CNPJ")).not.toBeInTheDocument();
  });

  it("should ask for confirmation and close on Cancelar", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ onClose });

    expect(screen.getByText(/deseja excluir o CNPJ 12\.ABC\.345\/01DE-35\?/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalled();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it("should delete the record and notify", async () => {
    const user = userEvent.setup();
    const onDeleted = jest.fn();
    apiClient.delete.mockResolvedValue({ message: "deleted" });
    renderModal({ onDeleted });

    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(apiClient.delete).toHaveBeenCalledWith("/cnpj/12ABC34501DE35");
    expect(onDeleted).toHaveBeenCalledWith(RECORD);
  });

  it("should show the spinner while deleting and an error alert when it fails", async () => {
    const user = userEvent.setup();
    const onDeleted = jest.fn();
    let rejectRequest;
    apiClient.delete.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject;
      }),
    );
    renderModal({ onDeleted });

    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(screen.getByText("Excluindo...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    rejectRequest(new Error("CNPJ data was not found in the database."));

    expect(await screen.findByText("Não foi possível excluir")).toBeInTheDocument();
    expect(screen.getByText("CNPJ data was not found in the database.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).not.toBeDisabled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
