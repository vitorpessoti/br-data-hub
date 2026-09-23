import {
  EMPTY_VALUE,
  formatCep,
  formatCnpj,
  formatCnae,
  formatCurrency,
  formatFieldLabel,
  formatFieldValue,
  formatPhone,
  formatStatus,
} from "./format-field.util";

describe("# format-field.util", () => {
  describe("formatFieldLabel", () => {
    it.each([
      ["ibgeCode", "Código IBGE"],
      ["cityIbgeCode", "Código IBGE do município"],
      ["corporateName", "Razão social"],
      ["optedForMei", "Optante pelo MEI"],
      ["uf", "UF"],
      ["cep", "CEP"],
      ["ddd", "DDD"],
      ["jobId", "Job ID"],
      ["snake_case-key", "Snake Case Key"],
      ["otherCnaeCep_uf", "Other CNAE CEP UF"],
    ])("should format %s as %s", (key, expected) => {
      expect(formatFieldLabel(key)).toBe(expected);
    });
  });

  describe("formatFieldValue", () => {
    it.each([null, undefined, ""])("should show a dash for %p", (value) => {
      expect(formatFieldValue(value)).toBe(EMPTY_VALUE);
    });

    it("should show booleans as Sim/Não", () => {
      expect(formatFieldValue(true)).toBe("Sim");
      expect(formatFieldValue(false)).toBe("Não");
    });

    it("should show lists and objects as indented JSON", () => {
      expect(formatFieldValue([{ codigo: 1 }])).toBe('[\n  {\n    "codigo": 1\n  }\n]');
    });

    it("should show date-only values as dd/mm/yyyy", () => {
      expect(formatFieldValue("2013-10-03T00:00:00.000Z")).toBe("03/10/2013");
      expect(formatFieldValue("2013-10-03T00:00:00Z")).toBe("03/10/2013");
    });

    it("should show date-time values in the pt-BR locale", () => {
      const value = "2026-09-21T15:30:00.000Z";

      expect(formatFieldValue(value)).toBe(new Date(value).toLocaleString("pt-BR"));
    });

    it.each([
      ["status", "completed", "Concluído"],
      ["cep", "01001000", "01001-000"],
      ["cnpj", "19131243000197", "19.131.243/0001-97"],
      ["primaryPhone", "1123456789", "(11) 2345-6789"],
      ["mainCnaeCode", 9430800, "9430-8/00"],
      ["shareCapital", "1500.5", "R$ 1.500,50"],
      ["country", "Brasil", "BRASIL"],
    ])("should format the %s field", (key, value, expected) => {
      expect(formatFieldValue(value, key)).toBe(expected);
    });

    it("should show other values as text", () => {
      expect(formatFieldValue("São Paulo")).toBe("São Paulo");
      expect(formatFieldValue(0)).toBe("0");
    });
  });

  describe("formatCep", () => {
    it("should add the hyphen to an 8-digit CEP", () => {
      expect(formatCep("01001000")).toBe("01001-000");
    });

    it.each(["0100100", null])("should keep %p as is", (value) => {
      expect(formatCep(value)).toBe(value);
    });
  });

  describe("formatStatus", () => {
    it.each([
      ["pending", "Pendente"],
      ["processing", "Processando"],
      ["completed", "Concluído"],
      ["failed", "Falhou"],
      ["archived", "Archived"],
      [null, EMPTY_VALUE],
    ])("should format %p as %p", (value, expected) => {
      expect(formatStatus(value)).toBe(expected);
    });
  });

  describe("formatPhone", () => {
    it.each([
      ["1123456789", "(11) 2345-6789"],
      ["11923456789", "(11) 92345-6789"],
      ["119234567890", "(11) 92345-6789"],
      ["1", "1"],
      ["11923", "(11) 923"],
      [null, ""],
    ])("should format %p as %p", (value, expected) => {
      expect(formatPhone(value)).toBe(expected);
    });
  });

  describe("formatCnae", () => {
    it.each([
      [9430800, "9430-8/00"],
      ["9430", "9430"],
      ["94308", "9430-8"],
      [undefined, ""],
    ])("should format %p as %p", (value, expected) => {
      expect(formatCnae(value)).toBe(expected);
    });
  });

  describe("formatCurrency", () => {
    it.each([
      ["0", "R$ 0,00"],
      ["1500.5", "R$ 1.500,50"],
      ["1234567890123456.78", "R$ 1.234.567.890.123.456,78"],
      [2500, "R$ 2.500,00"],
    ])("should format %p as %p", (value, expected) => {
      expect(formatCurrency(value)).toBe(expected);
    });
  });

  describe("formatCnpj", () => {
    it.each([
      ["19131243000197", "19.131.243/0001-97"],
      ["12ABC34501DE35", "12.ABC.345/01DE-35"],
    ])("should format %s as %s", (value, expected) => {
      expect(formatCnpj(value)).toBe(expected);
    });

    it.each(["123", undefined])("should keep %p as is", (value) => {
      expect(formatCnpj(value)).toBe(value);
    });
  });
});
