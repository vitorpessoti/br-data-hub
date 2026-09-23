// Conversões entre o valor salvo no backend e o valor do input no modal de edição.

export const toInputValue = (type, value) => {
  if (value === null || value === undefined) return "";
  if (type === "date") return String(value).slice(0, 10);
  // Mesmo formato que a máscara de moeda gera ("1234.50"), sem passar por Number.
  if (type === "decimal") {
    const [integer, decimals = ""] = String(value).split(".");
    return `${integer}.${decimals.padEnd(2, "0").slice(0, 2)}`;
  }
  return String(value);
};

const toPayloadValue = (type, input) => {
  const value = input.trim();
  if (value === "") return null;
  if (type === "integer") return Number(value);
  if (type === "boolean") return value === "true";
  return value;
};

// Monta o PATCH só com os campos alterados (os somente leitura nunca vão).
export const buildUpdatePayload = (resource, record, values) => {
  const payload = {};
  for (const field of resource.editableFields) {
    if (resource.readOnlyFields.includes(field)) continue;
    const type = resource.fieldTypes[field];
    if (values[field] !== toInputValue(type, record[field])) {
      payload[field] = toPayloadValue(type, values[field]);
    }
  }
  return payload;
};

export const buildInitialValues = (resource, record) =>
  Object.fromEntries(
    resource.editableFields.map((field) => [
      field,
      toInputValue(resource.fieldTypes[field], record[field]),
    ]),
  );
