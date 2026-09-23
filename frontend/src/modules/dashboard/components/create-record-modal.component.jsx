"use client";

import { useState } from "react";
import Input from "@/components/form/input/input-field.component";
import Label from "@/components/form/label.component";
import Alert from "@/components/ui/alert/alert.component";
import Button from "@/components/ui/button/button.component";
import { Modal } from "@/components/ui/modal/modal.component";
import Spinner from "@/components/ui/spinner/spinner.component";
import apiClient from "@/config/api-client.factory";

// Tamanho do CEP (8) e do CNPJ (14) sem máscara.
const ID_LENGTHS = { cep: 8, cnpj: 14 };

function CreateRecordForm({ resource, onClose, onCreated }) {
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const id = `new-${resource.key}`;
  const isComplete = value.length === ID_LENGTHS[resource.key];

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isComplete) return;

    setError(null);
    setIsSaving(true);
    try {
      // Só o valor cru (sem máscara) vai para o backend.
      const data = await apiClient.post(resource.path, { [resource.key]: value });
      onCreated(data);
    } catch (requestError) {
      setError(requestError.message);
      setIsSaving(false);
    }
  };

  return (
    <form className="flex flex-col px-2" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="mb-5">
          <Alert variant="error" title={`Não foi possível cadastrar o ${resource.label}`} message={error} />
        </div>
      )}

      <Label htmlFor={id}>{resource.label}</Label>
      <Input
        id={id}
        value={resource.idMask.format(value)}
        inputMode={resource.idMask.inputMode}
        placeholder={resource.idMask.placeholder}
        disabled={isSaving}
        autoFocus
        onChange={(event) => setValue(resource.idMask.parse(event.target.value))}
      />

      <div className="mt-6 flex items-center gap-3 sm:justify-end">
        <Button size="sm" variant="outline" type="button" onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button size="sm" type="submit" disabled={isSaving || !isComplete}>
          {isSaving ? (
            <Spinner size="sm" color="light" label="Cadastrando..." showLabel />
          ) : (
            "Cadastrar"
          )}
        </Button>
      </div>
    </form>
  );
}

// Cadastro de um novo CEP/CNPJ: o backend busca os dados na API externa
// (ou coloca na fila quando o limite de requisições foi atingido).
export default function CreateRecordModal({ resource, isOpen, onClose, onCreated }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-[500px]">
      {isOpen && (
        <div className="relative w-full rounded-3xl bg-white p-4 lg:p-11 dark:bg-gray-900">
          <div className="px-2 pe-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Novo {resource.label}
            </h4>
            <p className="mb-6 text-sm text-gray-500 lg:mb-7 dark:text-gray-400">
              Informe o {resource.label}: os dados completos são buscados
              automaticamente e salvos na base.
            </p>
          </div>
          <CreateRecordForm resource={resource} onClose={onClose} onCreated={onCreated} />
        </div>
      )}
    </Modal>
  );
}
