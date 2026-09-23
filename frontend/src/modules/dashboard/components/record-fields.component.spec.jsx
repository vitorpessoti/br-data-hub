import { render, screen } from "@testing-library/react";
import RecordFields from "./record-fields.component";

describe("# RecordFields", () => {
  it("should list every field with the formatted name and value", () => {
    const { container } = render(
      <RecordFields
        record={{
          id: "cep-1",
          status: "completed",
          ibgeCode: "3550308",
          complement: null,
          optedForMei: true,
          qsa: [{ nome: "HAYDEE" }],
        }}
      />,
    );

    expect(screen.getByText("Código IBGE")).toBeInTheDocument();
    expect(screen.getByText("3550308")).toBeInTheDocument();
    expect(screen.getByText("Complemento")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Optante pelo MEI")).toBeInTheDocument();
    expect(screen.getByText("Sim")).toBeInTheDocument();
    expect(screen.getByText("Quadro de sócios e administradores (QSA)")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Concluído")).toBeInTheDocument();
    expect(screen.queryByText("ID")).not.toBeInTheDocument();
    expect(screen.queryByText("cep-1")).not.toBeInTheDocument();
    expect(container.querySelector("pre")).toHaveTextContent('"nome": "HAYDEE"');
  });
});
