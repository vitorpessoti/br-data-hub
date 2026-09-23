import { RECORD_RESOURCES } from "@/modules/dashboard/config/record-resources.config";
import {
  buildInitialValues,
  buildUpdatePayload,
  toInputValue,
} from "./record-form.util";

const cnpjResource = RECORD_RESOURCES.cnpj;

const cnpjRecord = {
  id: "1",
  cnpj: "19131243000197",
  corporateName: "OPEN KNOWLEDGE BRASIL",
  tradeName: null,
  mainCnaeCode: 9430800,
  shareCapital: "0",
  activityStartDate: "2013-10-03T00:00:00.000Z",
  optedForSimples: null,
  optedForMei: false,
  qsa: [],
};

describe("# record-form.util", () => {
  describe("toInputValue", () => {
    it.each([
      ["text", null, ""],
      ["text", undefined, ""],
      ["text", "Rua A", "Rua A"],
      ["integer", 9430800, "9430800"],
      ["boolean", false, "false"],
      ["date", "2013-10-03T00:00:00.000Z", "2013-10-03"],
      ["decimal", "0", "0.00"],
      ["decimal", "1500.5", "1500.50"],
      ["decimal", 1500.55, "1500.55"],
    ])("should convert a %s value %p to %p", (type, value, expected) => {
      expect(toInputValue(type, value)).toBe(expected);
    });
  });

  describe("buildInitialValues", () => {
    it("should build the input value of every editable field", () => {
      const values = buildInitialValues(cnpjResource, cnpjRecord);

      expect(Object.keys(values)).toEqual(cnpjResource.editableFields);
      expect(values).toMatchObject({
        corporateName: "OPEN KNOWLEDGE BRASIL",
        tradeName: "",
        mainCnaeCode: "9430800",
        shareCapital: "0.00",
        activityStartDate: "2013-10-03",
        optedForSimples: "",
        optedForMei: "false",
      });
      expect(values).not.toHaveProperty("qsa");
    });
  });

  describe("buildUpdatePayload", () => {
    it("should be empty when nothing changed", () => {
      const values = buildInitialValues(cnpjResource, cnpjRecord);

      expect(buildUpdatePayload(cnpjResource, cnpjRecord, values)).toEqual({});
    });

    it("should send only the changed fields converted to the backend types", () => {
      const values = {
        ...buildInitialValues(cnpjResource, cnpjRecord),
        corporateName: "  NOVA RAZAO  ",
        tradeName: "Fantasia",
        mainCnaeCode: "6204000",
        shareCapital: "1500.50",
        activityStartDate: "2014-01-02",
        optedForSimples: "true",
        optedForMei: "",
      };

      expect(buildUpdatePayload(cnpjResource, cnpjRecord, values)).toEqual({
        corporateName: "NOVA RAZAO",
        tradeName: "Fantasia",
        mainCnaeCode: 6204000,
        shareCapital: "1500.50",
        activityStartDate: "2014-01-02",
        optedForSimples: true,
        optedForMei: null,
      });
    });

    it("should never send the read-only fields", () => {
      const values = {
        ...buildInitialValues(cnpjResource, cnpjRecord),
        countryCode: "105",
        companySizeCode: "5",
      };

      expect(buildUpdatePayload(cnpjResource, cnpjRecord, values)).toEqual({});
    });

    it("should send false for a boolean changed to Não", () => {
      const values = {
        ...buildInitialValues(cnpjResource, cnpjRecord),
        optedForSimples: "false",
      };

      expect(buildUpdatePayload(cnpjResource, cnpjRecord, values)).toEqual({
        optedForSimples: false,
      });
    });
  });
});
