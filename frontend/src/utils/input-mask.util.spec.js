import {
  CEP_MASK,
  CNAE_MASK,
  CNPJ_MASK,
  CURRENCY_MASK,
  PHONE_MASK,
  UF_MASK,
  UPPERCASE_MASK,
  digitsMask,
} from "./input-mask.util";

describe("# input-mask.util", () => {
  it.each([
    ["digitsMask(2)", digitsMask(2), "1a23", "12", "12"],
    ["CEP_MASK", CEP_MASK, "01001-0009", "01001-000", "01001000"],
    ["CEP_MASK (partial)", CEP_MASK, "0100", "0100", "0100"],
    ["CNPJ_MASK", CNPJ_MASK, "19131243000197", "19.131.243/0001-97", "19131243000197"],
    ["CNPJ_MASK (alphanumeric)", CNPJ_MASK, "12.abc.345/01de-35", "12.ABC.345/01DE-35", "12ABC34501DE35"],
    ["CNPJ_MASK (letters in the check digits)", CNPJ_MASK, "12ABC34501DEX3", "12.ABC.345/01DE-3", "12ABC34501DE3"],
    ["PHONE_MASK", PHONE_MASK, "(11) 2345-6789", "(11) 2345-6789", "1123456789"],
    ["CNAE_MASK", CNAE_MASK, "9430-8/00", "9430-8/00", "9430800"],
    ["UF_MASK", UF_MASK, "s1p", "S1P", "SP"],
    ["UPPERCASE_MASK", UPPERCASE_MASK, "Brasil", "BRASIL", "BRASIL"],
  ])("%s should format and parse the typed text", (_, mask, text, formatted, parsed) => {
    expect(mask.format(text)).toBe(formatted);
    expect(mask.parse(text)).toBe(parsed);
  });

  it.each([digitsMask(2), CEP_MASK, CNPJ_MASK, UF_MASK, UPPERCASE_MASK])(
    "should format an empty value as an empty text",
    (mask) => {
      expect(mask.format(null)).toBe("");
    },
  );

  describe("CURRENCY_MASK", () => {
    it.each([
      ["", ""],
      ["1500.50", "R$ 1.500,50"],
    ])("should format %p as %p", (raw, expected) => {
      expect(CURRENCY_MASK.format(raw)).toBe(expected);
    });

    it.each([
      ["", ""],
      ["R$ 0,005", "0.05"],
      ["R$ 1.500,500", "15005.00"],
      ["R$ 0,0", "0.00"],
      ["1234567890123456789", "1234567890123456.78"],
    ])("should parse %p as %p", (text, expected) => {
      expect(CURRENCY_MASK.parse(text)).toBe(expected);
    });
  });
});
