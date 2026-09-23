"use client";

import { useState } from "react";
import Input from "@/components/form/input/input-field.component";
import Label from "@/components/form/label.component";
import Alert from "@/components/ui/alert/alert.component";
import Button from "@/components/ui/button/button.component";
import { Modal } from "@/components/ui/modal/modal.component";
import Spinner from "@/components/ui/spinner/spinner.component";
import apiClient from "@/config/api-client.factory";
import RecordFields from "@/modules/dashboard/components/record-fields.component";
import {
  buildInitialValues,
  buildUpdatePayload,
} from "@/modules/dashboard/utils/record-form.util";
import { formatFieldLabel } from "@/utils/format-field.util";
import { digitsMask } from "@/utils/input-mask.util";

const INTEGER_MASK = digitsMask(10);
const SELECT_CLASS_NAME =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

// Máscara do campo: a do recurso ou, para códigos numéricos, só dígitos.
const fieldMask = (resource, field) =>
  resource.fieldMasks[field] ??
  (resource.fieldTypes[field] === "integer" ? INTEGER_MASK : undefined);

function FieldInput({ id, type, mask, value, disabled, readOnly, onChange }) {
  if (type === "boolean") {
    return (
      <select
        id={id}
        value={value}
        disabled={disabled || readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={SELECT_CLASS_NAME}
      >
        <option value="">Não informado</option>
        <option value="true">Sim</option>
        <option value="false">Não</option>
      </select>
    );
  }

  if (type === "date") {
    return (
      <Input
        id={id}
        type="date"
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  // A máscara é só visual: o estado guarda (e o PATCH envia) o valor cru.
  return (
    <Input
      id={id}
      value={mask ? mask.format(value) : value}
      inputMode={mask?.inputMode}
      placeholder={mask?.placeholder}
      disabled={disabled}
      readOnly={readOnly}
      className={readOnly ? "cursor-not-allowed bg-gray-50 dark:bg-white/3" : ""}
      onChange={(event) =>
        onChange(mask ? mask.parse(event.target.value) : event.target.value)
      }
    />
  );
}

function RecordEditForm({ resource, record, onClose, onSaved }) {
  const [values, setValues] = useState(() => buildInitialValues(resource, record));
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const readOnlyRecord = Object.fromEntries(
    Object.entries(record).filter(([key]) => !resource.editableFields.includes(key)),
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAlert(null);

    const payload = buildUpdatePayload(resource, record, values);
    if (Object.keys(payload).length === 0) {
      setAlert({
        variant: "info",
        title: "Nada para salvar",
        message: "Nenhum campo foi alterado.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const data = await apiClient.patch(
        `${resource.path}/${encodeURIComponent(record[resource.key])}`,
        payload,
      );
      onSaved(data[resource.key]);
    } catch (error) {
      setAlert({
        variant: "error",
        title: "Não foi possível salvar",
        message: error.message,
      });
      setIsSaving(false);
    }
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit} noValidate>
      <div className="custom-scrollbar max-h-[60vh] overflow-y-auto px-2 pb-3">
        {alert && (
          <div className="mb-5">
            <Alert variant={alert.variant} title={alert.title} message={alert.message} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {resource.editableFields.map((field) => {
            const id = `${resource.key}-${field}`;
            return (
              <div key={field}>
                <Label htmlFor={id}>{formatFieldLabel(field)}</Label>
                <FieldInput
                  id={id}
                  type={resource.fieldTypes[field]}
                  mask={fieldMask(resource, field)}
                  value={values[field]}
                  disabled={isSaving}
                  readOnly={resource.readOnlyFields.includes(field)}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, [field]: value }))
                  }
                />
              </div>
            );
          })}
        </div>

        <h5 className="mt-8 mb-5 text-base font-medium text-gray-800 dark:text-white/90">
          Demais dados (somente leitura)
        </h5>
        <RecordFields record={readOnlyRecord} />
      </div>

      <div className="mt-6 flex items-center gap-3 px-2 sm:justify-end">
        <Button size="sm" variant="outline" type="button" onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button size="sm" type="submit" disabled={isSaving}>
          {isSaving ? (
            <Spinner size="sm" color="light" label="Salvando..." showLabel />
          ) : (
            "Salvar alterações"
          )}
        </Button>
      </div>
    </form>
  );
}

// Modal com os dados completos de um CEP/CNPJ: `mode` "view" só exibe,
// "edit" permite alterar os campos que o backend aceita no PATCH.
export default function RecordDetailsModal({ resource, record, mode, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const formattedId = record ? resource.formatId(record[resource.key]) : "";

  return (
    <Modal isOpen={Boolean(record)} onClose={onClose} className="m-4 max-w-[900px]">
      {record && (
        <div className="relative w-full rounded-3xl bg-white p-4 lg:p-11 dark:bg-gray-900">
          <div className="px-2 pe-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {resource.label} {formattedId}
            </h4>
            <p className="mb-6 text-sm text-gray-500 lg:mb-7 dark:text-gray-400">
              {isEdit
                ? "Editando: altere os campos desejados e salve."
                : "Visualizando os dados completos do registro salvo na base."}
            </p>
          </div>

          {isEdit ? (
            <RecordEditForm
              key={record.id}
              resource={resource}
              record={record}
              onClose={onClose}
              onSaved={onSaved}
            />
          ) : (
            <>
              <div className="custom-scrollbar max-h-[60vh] overflow-y-auto px-2 pb-3">
                <RecordFields record={record} />
              </div>
              <div className="mt-6 flex items-center px-2 sm:justify-end">
                <Button size="sm" variant="outline" type="button" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
