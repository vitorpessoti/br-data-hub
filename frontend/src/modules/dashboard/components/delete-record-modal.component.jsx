"use client";

import { useState } from "react";
import Alert from "@/components/ui/alert/alert.component";
import Button from "@/components/ui/button/button.component";
import { Modal } from "@/components/ui/modal/modal.component";
import Spinner from "@/components/ui/spinner/spinner.component";
import apiClient from "@/config/api-client.factory";

function DeleteRecordContent({ resource, record, onClose, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const formattedId = resource.formatId(record[resource.key]);

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await apiClient.delete(`${resource.path}/${encodeURIComponent(record[resource.key])}`);
      onDeleted(record);
    } catch (requestError) {
      setError(requestError.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="text-center">
      <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
        Excluir {resource.label}
      </h4>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Tem certeza que deseja excluir o {resource.label} {formattedId}? Essa
        ação não pode ser desfeita.
      </p>

      {error && (
        <div className="mb-6 text-start">
          <Alert variant="error" title="Não foi possível excluir" message={error} />
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <Button size="sm" variant="outline" type="button" onClick={onClose} disabled={isDeleting}>
          Cancelar
        </Button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? (
            <Spinner size="sm" color="light" label="Excluindo..." showLabel />
          ) : (
            "Excluir"
          )}
        </button>
      </div>
    </div>
  );
}

// Confirmação antes de excluir um CEP/CNPJ da base.
export default function DeleteRecordModal({ resource, record, onClose, onDeleted }) {
  return (
    <Modal isOpen={Boolean(record)} onClose={onClose} className="m-4 max-w-[500px] p-6 lg:p-10">
      {record && (
        <DeleteRecordContent
          key={record.id}
          resource={resource}
          record={record}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      )}
    </Modal>
  );
}
