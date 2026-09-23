import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import apiClient from "@/config/api-client.factory";
import { RECORD_RESOURCES } from "@/modules/dashboard/config/record-resources.config";
import RecordDetailsModal from "./record-details-modal.component";

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { patch: jest.fn() },
}));

const CEP_RECORD = {
  id: "cep-1",
  cep: "01001000",
  street: "Praça da Sé",
  complement: null,
  city: "São Paulo",
  ibgeCode: "3550308",
  jobId: null,
  status: "completed",
};

const CNPJ_RECORD = {
  id: "cnpj-1",
  cnpj: "19131243000197",
  corporateName: "OPEN KNOWLEDGE BRASIL",
  mainCnaeCode: 9430800,
  shareCapital: "0",
  activityStartDate: "2013-10-03T00:00:00.000Z",
  optedForSimples: null,
  qsa: [{ nome: "HAYDEE" }],
};

const renderModal = (props) =>
  render(
    <RecordDetailsModal
      resource={RECORD_RESOURCES.cep}
      record={CEP_RECORD}
      mode="view"
      onClose={jest.fn()}
      onSaved={jest.fn()}
      {...props}
    />,
  );

describe("# RecordDetailsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render nothing without a record", () => {
    renderModal({ record: null });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("should show every field of the record in view mode", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ onClose });

    expect(screen.getByRole("heading", { name: "CEP 01001-000" })).toBeInTheDocument();
    expect(screen.getByText(/^Visualizando/)).toBeInTheDocument();
    expect(screen.getByText("Código IBGE")).toBeInTheDocument();
    expect(screen.getByText("3550308")).toBeInTheDocument();
    expect(screen.getByText("Job ID")).toBeInTheDocument();
    expect(screen.getByText("Concluído")).toBeInTheDocument();
    expect(screen.queryByText("cep-1")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("should show the editable fields as inputs and the others as read-only in edit mode", () => {
    renderModal({ mode: "edit" });

    expect(screen.getByRole("heading", { name: "CEP 01001-000" })).toBeInTheDocument();
    expect(screen.getByText(/^Editando/)).toBeInTheDocument();
    expect(screen.getByLabelText("Logradouro")).toHaveValue("Praça da Sé");
    expect(screen.getByLabelText("Complemento")).toHaveValue("");
    expect(screen.getByLabelText("Código IBGE")).toHaveValue("3550308");
    expect(screen.getByText("Demais dados (somente leitura)")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.queryByLabelText("CEP")).not.toBeInTheDocument();
  });

  it("should send only the changed fields and hand back the updated record", async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    const updated = { ...CEP_RECORD, street: "Rua Nova", complement: "Bloco B" };
    apiClient.patch.mockResolvedValue({ message: "ok", cep: updated });
    renderModal({ mode: "edit", onSaved });

    await user.clear(screen.getByLabelText("Logradouro"));
    await user.type(screen.getByLabelText("Logradouro"), "Rua Nova");
    await user.type(screen.getByLabelText("Complemento"), "Bloco B");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(apiClient.patch).toHaveBeenCalledWith("/cep/01001000", {
      street: "Rua Nova",
      complement: "Bloco B",
    });
    expect(onSaved).toHaveBeenCalledWith(updated);
  });

  it("should show an info alert and not call the backend when nothing changed", async () => {
    const user = userEvent.setup();
    renderModal({ mode: "edit" });

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(screen.getByText("Nada para salvar")).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("should show the spinner while saving and an error alert when it fails", async () => {
    const user = userEvent.setup();
    let rejectRequest;
    apiClient.patch.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject;
      }),
    );
    renderModal({ mode: "edit" });

    await user.type(screen.getByLabelText("Complemento"), "x");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(screen.getByText("Salvando...")).toBeInTheDocument();
    expect(screen.getByLabelText("Complemento")).toBeDisabled();

    rejectRequest(new Error("The 'uf' field must be 2 letters."));

    expect(await screen.findByText("Não foi possível salvar")).toBeInTheDocument();
    expect(screen.getByText("The 'uf' field must be 2 letters.")).toBeInTheDocument();
    expect(screen.getByLabelText("Complemento")).not.toBeDisabled();
  });

  it("should close on Cancelar", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ mode: "edit", onClose });

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("should show the CNPJ fields with masks and keep the read-only codes unchanged", async () => {
    const user = userEvent.setup();
    renderModal({ resource: RECORD_RESOURCES.cnpj, record: CNPJ_RECORD, mode: "edit" });

    expect(screen.getByRole("heading", { name: "CNPJ 19.131.243/0001-97" })).toBeInTheDocument();
    expect(screen.getByLabelText("CNAE principal")).toHaveValue("9430-8/00");
    expect(screen.getByLabelText("Capital social")).toHaveValue("R$ 0,00");
    expect(screen.getByLabelText("Início da atividade")).toHaveValue("2013-10-03");
    expect(screen.getByLabelText("Início da atividade")).toHaveAttribute("type", "date");
    expect(screen.getByText("Quadro de sócios e administradores (QSA)")).toBeInTheDocument();
    expect(screen.getByLabelText("Código do país")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Código do porte")).toHaveAttribute("readonly");

    await user.type(screen.getByLabelText("Código do país"), "9");
    expect(screen.getByLabelText("Código do país")).toHaveValue("");
    await user.type(screen.getByLabelText("UF"), "s1p");
    expect(screen.getByLabelText("UF")).toHaveValue("SP");
  });

  it("should send the CNPJ values without the masks", async () => {
    const user = userEvent.setup();
    apiClient.patch.mockResolvedValue({ cnpj: CNPJ_RECORD });
    renderModal({ resource: RECORD_RESOURCES.cnpj, record: CNPJ_RECORD, mode: "edit" });

    const change = (label, value) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    change("CEP", "01001000");
    change("Telefone principal", "11923456789");
    change("Capital social", "R$ 0,0150050");
    change("País", "brasil");
    change("Código IBGE do município", "35a50308");
    change("Início da atividade", "2014-01-02");

    expect(screen.getByLabelText("CEP")).toHaveValue("01001-000");
    expect(screen.getByLabelText("Telefone principal")).toHaveValue("(11) 92345-6789");
    expect(screen.getByLabelText("Capital social")).toHaveValue("R$ 1.500,50");
    expect(screen.getByLabelText("País")).toHaveValue("BRASIL");
    expect(screen.getByLabelText("Código IBGE do município")).toHaveValue("3550308");

    await user.selectOptions(screen.getByLabelText("Optante pelo Simples"), "Sim");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(apiClient.patch).toHaveBeenCalledWith("/cnpj/19131243000197", {
      cep: "01001000",
      primaryPhone: "11923456789",
      shareCapital: "1500.50",
      country: "BRASIL",
      cityIbgeCode: 3550308,
      activityStartDate: "2014-01-02",
      optedForSimples: true,
    });
  });
});
