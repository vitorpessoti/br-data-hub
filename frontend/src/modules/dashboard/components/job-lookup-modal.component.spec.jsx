import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import apiClient from "@/config/api-client.factory";
import JobLookupModal from "./job-lookup-modal.component";

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const JOB_ID = "7f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f";
const CEP_RECORD = { id: "cep-1", cep: "01001000", ibgeCode: "3550308", status: "completed" };

const renderModal = (props) =>
  render(<JobLookupModal isOpen onClose={jest.fn()} onFound={jest.fn()} {...props} />);

describe("# JobLookupModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render nothing when closed", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByText("Consultar cadastro por jobId")).not.toBeInTheDocument();
  });

  it("should keep Consultar disabled while the jobId is blank", async () => {
    const user = userEvent.setup();
    renderModal();

    const button = screen.getByRole("button", { name: "Consultar" });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText("Job ID"), "   ");
    expect(button).toBeDisabled();

    fireEvent.submit(screen.getByLabelText("Job ID").closest("form"));
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("should look up the jobId and show the record with its status", async () => {
    const user = userEvent.setup();
    const onFound = jest.fn();
    apiClient.get.mockResolvedValue({
      message: "Job found.",
      jobId: JOB_ID,
      type: "cep",
      status: "completed",
      cep: CEP_RECORD,
    });
    renderModal({ onFound });

    await user.type(screen.getByLabelText("Job ID"), ` ${JOB_ID} `);
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(apiClient.get).toHaveBeenCalledWith(`/jobs/${JOB_ID}`);
    expect(await screen.findByText("CEP encontrado")).toBeInTheDocument();
    expect(screen.getAllByText("Concluído")).toHaveLength(2);
    expect(screen.getByText("Código IBGE")).toBeInTheDocument();
    expect(onFound).toHaveBeenCalledWith("cep", CEP_RECORD);
  });

  it("should start with the given jobId and show an error alert when the lookup fails", async () => {
    const user = userEvent.setup();
    const onFound = jest.fn();
    let rejectRequest;
    apiClient.get.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject;
      }),
    );
    renderModal({ initialJobId: JOB_ID, onFound });

    expect(screen.getByLabelText("Job ID")).toHaveValue(JOB_ID);

    await user.click(screen.getByRole("button", { name: "Consultar" }));
    expect(screen.getByText("Consultando...")).toBeInTheDocument();

    rejectRequest(new Error("No CEP or CNPJ was found for this jobId."));

    expect(await screen.findByText("Não foi possível consultar")).toBeInTheDocument();
    expect(screen.getByText("No CEP or CNPJ was found for this jobId.")).toBeInTheDocument();
    expect(onFound).not.toHaveBeenCalled();
  });
});
