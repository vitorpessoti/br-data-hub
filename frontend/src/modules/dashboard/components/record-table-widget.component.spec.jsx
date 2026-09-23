import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import apiClient from "@/config/api-client.factory";
import RecordTableWidget from "./record-table-widget.component";

jest.mock("@/config/api-client.factory", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const JOB_ID = "7f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f";

const SE = {
  id: "cep-1",
  cep: "01001000",
  street: "Praça da Sé",
  neighborhood: "Sé",
  city: "São Paulo",
  uf: "SP",
  jobId: null,
  status: "completed",
};

const PENDING = {
  id: "cep-2",
  cep: "20040002",
  street: null,
  neighborhood: null,
  city: null,
  uf: null,
  jobId: JOB_ID,
  status: "pending",
};

const listResponse = (ceps) => ({ message: "CEP data listed.", total: ceps.length, ceps });

const renderWidget = async (ceps = [SE, PENDING]) => {
  apiClient.get.mockResolvedValueOnce(listResponse(ceps));
  render(<RecordTableWidget resourceKey="cep" />);
  await screen.findByText(ceps.length ? "01001-000" : "Nenhum CEP cadastrado.");
};

const rowOf = (text) => screen.getByText(text).closest("tr");

describe("# RecordTableWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should load the stored records into the table", async () => {
    await renderWidget();

    expect(apiClient.get).toHaveBeenCalledWith("/cep");
    expect(screen.getByRole("heading", { name: "CEP" })).toBeInTheDocument();

    const seRow = rowOf("01001-000");
    expect(within(seRow).getByText("Praça da Sé")).toBeInTheDocument();
    expect(within(seRow).getByText("SP")).toBeInTheDocument();
    expect(within(seRow).getByText("Concluído")).toBeInTheDocument();
    expect(within(seRow).getByRole("button", { name: "Visualizar CEP 01001-000" })).toBeInTheDocument();
    expect(within(seRow).getByRole("button", { name: "Alterar CEP 01001-000" })).toBeInTheDocument();
    expect(within(seRow).getByRole("button", { name: "Excluir CEP 01001-000" })).toBeInTheDocument();
    expect(within(seRow).queryByRole("button", { name: /Consultar jobId/ })).not.toBeInTheDocument();

    const pendingRow = rowOf("20040-002");
    expect(within(pendingRow).getAllByText("—")).toHaveLength(4);
    expect(within(pendingRow).getByText("Pendente")).toBeInTheDocument();
    expect(
      within(pendingRow).getByRole("button", { name: "Consultar jobId do CEP 20040-002" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "CEP" })).toHaveClass("whitespace-nowrap");
  });

  it("should register a new record with the raw value and add it to the top of the table", async () => {
    const user = userEvent.setup();
    await renderWidget();
    const created = { ...SE, id: "cep-3", cep: "30130010", street: "Praça Sete" };
    apiClient.post.mockResolvedValue({ message: "saved", cep: created });

    await user.click(screen.getByRole("button", { name: "Novo CEP" }));
    await user.type(screen.getByLabelText("CEP"), "30130010");
    expect(screen.getByLabelText("CEP")).toHaveValue("30130-010");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(apiClient.post).toHaveBeenCalledWith("/cep", { cep: "30130010" });
    expect(await screen.findByText("CEP cadastrado")).toBeInTheDocument();
    expect(screen.getByText("O CEP 30130-010 foi cadastrado com sucesso.")).toBeInTheDocument();
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("30130-010");
    expect(screen.queryByRole("heading", { name: "Novo CEP" })).not.toBeInTheDocument();
  });

  it("should replace the row when the registered record already exists", async () => {
    const user = userEvent.setup();
    await renderWidget();
    apiClient.post.mockResolvedValue({ message: "refreshed", cep: { ...SE, street: "Praça da Sé, 1" } });

    await user.click(screen.getByRole("button", { name: "Novo CEP" }));
    await user.type(screen.getByLabelText("CEP"), "01001000");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("CEP cadastrado")).toBeInTheDocument();
    expect(screen.getAllByText("01001-000")).toHaveLength(1);
    expect(within(rowOf("01001-000")).getByText("Praça da Sé, 1")).toBeInTheDocument();
  });

  it("should reload the table when the new record goes to the queue", async () => {
    const user = userEvent.setup();
    await renderWidget();
    // Corpo real do 202: o backend não envia `queued`, só o jobId e o valor cru.
    apiClient.post.mockResolvedValue({
      message: "queued",
      jobId: JOB_ID,
      status: "pending",
      cep: "30130010",
    });
    apiClient.get.mockResolvedValueOnce(
      listResponse([{ ...PENDING, id: "cep-3", cep: "30130010" }, SE, PENDING]),
    );

    await user.click(screen.getByRole("button", { name: "Novo CEP" }));
    await user.type(screen.getByLabelText("CEP"), "30130010");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("CEP enviado para a fila")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`CEP 30130-010 .*jobId: ${JOB_ID}`))).toBeInTheDocument();
    expect(await screen.findByText("30130-010")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it("should reload the CNPJ table when the new CNPJ goes to the queue", async () => {
    const user = userEvent.setup();
    const pendingCnpj = {
      id: "cnpj-1",
      cnpj: "19131243000197",
      corporateName: null,
      tradeName: null,
      city: null,
      uf: null,
      jobId: JOB_ID,
      status: "pending",
    };
    apiClient.get.mockResolvedValueOnce({ message: "listed", total: 0, cnpjs: [] });
    render(<RecordTableWidget resourceKey="cnpj" />);
    await screen.findByText("Nenhum CNPJ cadastrado.");
    apiClient.post.mockResolvedValue({
      message: "queued",
      jobId: JOB_ID,
      status: "pending",
      cnpj: "19131243000197",
    });
    apiClient.get.mockResolvedValueOnce({ message: "listed", total: 1, cnpjs: [pendingCnpj] });

    await user.click(screen.getByRole("button", { name: "Novo CNPJ" }));
    await user.type(screen.getByLabelText("CNPJ"), "19131243000197");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("CNPJ enviado para a fila")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`CNPJ 19.131.243/0001-97 .*jobId: ${JOB_ID}`))).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    await screen.findByText("19.131.243/0001-97");
    const row = rowOf("19.131.243/0001-97");
    expect(within(row).getAllByText("—")).toHaveLength(4);
    expect(
      within(row).getByRole("button", { name: "Consultar jobId do CNPJ 19.131.243/0001-97" }),
    ).toBeInTheDocument();
  });

  it("should close the new record modal on Cancelar", async () => {
    const user = userEvent.setup();
    await renderWidget();

    await user.click(screen.getByRole("button", { name: "Novo CEP" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("heading", { name: "Novo CEP" })).not.toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("should show the empty message when nothing is stored", async () => {
    await renderWidget([]);

    expect(screen.getByText("Nenhum CEP cadastrado.")).toBeInTheDocument();
  });

  it("should show an error alert when the list cannot be loaded and reload on Atualizar", async () => {
    const user = userEvent.setup();
    apiClient.get.mockRejectedValueOnce(new Error("Não foi possível conectar ao servidor."));
    render(<RecordTableWidget resourceKey="cep" />);

    expect(await screen.findByText("Não foi possível carregar os CEPs")).toBeInTheDocument();

    apiClient.get.mockResolvedValueOnce(listResponse([SE]));
    await user.click(screen.getByRole("button", { name: "Atualizar" }));

    expect(await screen.findByText("01001-000")).toBeInTheDocument();
    expect(screen.queryByText("Não foi possível carregar os CEPs")).not.toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it("should open the full record in view mode and close it", async () => {
    const user = userEvent.setup();
    await renderWidget();

    await user.click(screen.getByRole("button", { name: "Visualizar CEP 01001-000" }));

    expect(screen.getByRole("heading", { name: "CEP 01001-000" })).toBeInTheDocument();
    expect(screen.getByText("Job ID")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(screen.queryByRole("heading", { name: "CEP 01001-000" })).not.toBeInTheDocument();
  });

  it("should update the row after editing the record", async () => {
    const user = userEvent.setup();
    await renderWidget();
    apiClient.patch.mockResolvedValue({ cep: { ...SE, street: "Rua Nova" } });

    await user.click(screen.getByRole("button", { name: "Alterar CEP 01001-000" }));
    await user.clear(screen.getByLabelText("Logradouro"));
    await user.type(screen.getByLabelText("Logradouro"), "Rua Nova");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("CEP atualizado")).toBeInTheDocument();
    expect(screen.getByText("O CEP 01001-000 foi atualizado com sucesso.")).toBeInTheDocument();
    expect(within(rowOf("01001-000")).getByText("Rua Nova")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "CEP 01001-000" })).not.toBeInTheDocument();
  });

  it("should close the edit modal on Cancelar", async () => {
    const user = userEvent.setup();
    await renderWidget();

    await user.click(screen.getByRole("button", { name: "Alterar CEP 01001-000" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("heading", { name: "CEP 01001-000" })).not.toBeInTheDocument();
  });

  it("should remove the row after confirming the deletion", async () => {
    const user = userEvent.setup();
    await renderWidget();
    apiClient.delete.mockResolvedValue({ message: "deleted" });

    await user.click(screen.getByRole("button", { name: "Excluir CEP 01001-000" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("CEP excluído")).toBeInTheDocument();
    expect(apiClient.delete).toHaveBeenCalledWith("/cep/01001000");
    expect(screen.queryByText("01001-000")).not.toBeInTheDocument();
    expect(screen.getByText("20040-002")).toBeInTheDocument();
  });

  it("should keep the row when the deletion is cancelled", async () => {
    const user = userEvent.setup();
    await renderWidget();

    await user.click(screen.getByRole("button", { name: "Excluir CEP 01001-000" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Excluir CEP")).not.toBeInTheDocument();
    expect(screen.getByText("01001-000")).toBeInTheDocument();
  });

  it("should look up a row's jobId and refresh the row with the result", async () => {
    const user = userEvent.setup();
    await renderWidget();
    const completed = { ...PENDING, city: "Rio de Janeiro", status: "completed" };
    apiClient.get.mockResolvedValueOnce({ type: "cep", status: "completed", cep: completed });

    await user.click(screen.getByRole("button", { name: "Consultar jobId do CEP 20040-002" }));
    expect(screen.getByLabelText("Job ID")).toHaveValue(JOB_ID);
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(await screen.findByText("CEP encontrado")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenLastCalledWith(`/jobs/${JOB_ID}`);
    const row = screen.getAllByText("20040-002")[0].closest("tr");
    expect(within(row).getByText("Rio de Janeiro")).toBeInTheDocument();
  });

  it("should open an empty jobId lookup from the header and ignore records of the other type", async () => {
    const user = userEvent.setup();
    await renderWidget();
    apiClient.get.mockResolvedValueOnce({
      type: "cnpj",
      status: "completed",
      cnpj: { id: "cep-1", cnpj: "19131243000197", status: "completed" },
    });

    await user.click(screen.getByRole("button", { name: "Consultar por jobId" }));
    expect(screen.getByLabelText("Job ID")).toHaveValue("");

    await user.type(screen.getByLabelText("Job ID"), JOB_ID);
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(await screen.findByText("CNPJ encontrado")).toBeInTheDocument();
    expect(screen.getByText("01001-000")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByText("Consultar cadastro por jobId")).not.toBeInTheDocument(),
    );
  });
});
