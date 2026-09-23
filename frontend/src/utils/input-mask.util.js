import { formatCnae, formatCurrency, formatPhone } from "@/utils/format-field.util";

// Máscaras dos inputs: `format` gera o texto exibido a partir do valor cru e
// `parse` devolve o valor cru (sem máscara) a partir do que foi digitado.
// O formulário guarda e envia sempre o valor cru.

const onlyDigits = (text, maxLength) => String(text ?? "").replace(/\D/g, "").slice(0, maxLength);

export const digitsMask = (maxLength) => ({
  inputMode: "numeric",
  format: (raw) => onlyDigits(raw, maxLength),
  parse: (text) => onlyDigits(text, maxLength),
});

export const CEP_MASK = {
  inputMode: "numeric",
  placeholder: "00000-000",
  format: (raw) => {
    const digits = onlyDigits(raw, 8);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  },
  parse: (text) => onlyDigits(text, 8),
};

// CNPJ numérico ou alfanumérico: 12 caracteres (letras ou números) + 2 dígitos.
const cnpjChars = (text) => {
  const chars = String(text ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const base = chars.slice(0, 12);
  return base + onlyDigits(chars.slice(12), 14 - base.length);
};

const CNPJ_SEPARATORS = { 2: ".", 5: ".", 8: "/", 12: "-" };

export const CNPJ_MASK = {
  placeholder: "00.000.000/0000-00",
  format: (raw) =>
    [...cnpjChars(raw)].map((char, index) => (CNPJ_SEPARATORS[index] ?? "") + char).join(""),
  parse: cnpjChars,
};

export const PHONE_MASK = {
  inputMode: "tel",
  placeholder: "(00) 00000-0000",
  format: formatPhone,
  parse: (text) => onlyDigits(text, 11),
};

export const CNAE_MASK = {
  inputMode: "numeric",
  placeholder: "0000-0/00",
  format: formatCnae,
  parse: (text) => onlyDigits(text, 7),
};

export const UF_MASK = {
  placeholder: "SP",
  format: (raw) => String(raw ?? "").toUpperCase(),
  parse: (text) => text.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase(),
};

export const UPPERCASE_MASK = {
  format: (raw) => String(raw ?? "").toUpperCase(),
  parse: (text) => text.toUpperCase(),
};

// Valor cru "1234.56" <-> "R$ 1.234,56". Cada dígito digitado entra pelos centavos.
export const CURRENCY_MASK = {
  inputMode: "numeric",
  placeholder: "R$ 0,00",
  format: (raw) => (raw === "" ? "" : formatCurrency(raw)),
  parse: (text) => {
    const digits = onlyDigits(text, 18);
    if (digits === "") return "";
    const cents = digits.padStart(3, "0");
    return `${cents.slice(0, -2).replace(/^0+(?=\d)/, "")}.${cents.slice(-2)}`;
  },
};
