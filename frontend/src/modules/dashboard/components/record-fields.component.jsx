import { formatFieldLabel, formatFieldValue } from "@/utils/format-field.util";

// Campos internos que não aparecem para o usuário.
const HIDDEN_FIELDS = ["id"];

// Lista os campos de um registro (CEP/CNPJ), com o nome em português
// ("ibgeCode" -> "Código IBGE"). Listas e objetos aparecem como JSON.
export default function RecordFields({ record }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      {Object.entries(record)
        .filter(([key]) => !HIDDEN_FIELDS.includes(key))
        .map(([key, value]) => {
          const isStructured = value !== null && typeof value === "object";
          return (
            <div key={key} className={isStructured ? "sm:col-span-2" : undefined}>
              <dt className="mb-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {formatFieldLabel(key)}
              </dt>
              <dd className="text-sm font-medium break-words text-gray-800 dark:text-white/90">
                {isStructured ? (
                  <pre className="custom-scrollbar max-h-60 overflow-auto rounded-lg bg-gray-50 p-3 text-theme-xs font-normal whitespace-pre-wrap dark:bg-white/3">
                    {formatFieldValue(value, key)}
                  </pre>
                ) : (
                  formatFieldValue(value, key)
                )}
              </dd>
            </div>
          );
        })}
    </dl>
  );
}
