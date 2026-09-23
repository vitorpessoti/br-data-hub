"use client";

import { useState } from "react";
import Input from "@/components/form/input/input-field.component";
import Label from "@/components/form/label.component";
import Alert from "@/components/ui/alert/alert.component";
import Button from "@/components/ui/button/button.component";
import { Modal } from "@/components/ui/modal/modal.component";
import Spinner from "@/components/ui/spinner/spinner.component";
import apiClient from "@/config/api-client.factory";
import EnrichmentStatusBadge from "@/modules/dashboard/components/enrichment-status-badge.component";
import RecordFields from "@/modules/dashboard/components/record-fields.component";

const TYPE_LABELS = { cep: "CEP", cnpj: "CNPJ" };

function JobLookupContent({ initialJobId, onFound }) {
  const [jobId, setJobId] = useState(initialJobId);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = jobId.trim();
    if (!value) return;

    setError(null);
    setResult(null);
    setIsSearching(true);
    try {
      const data = await apiClient.get(`/jobs/${encodeURIComponent(value)}`);
      setResult(data);
      onFound(data.type, data[data.type]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <form className="flex flex-col gap-3 px-2 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        <div className="flex-1">
          <Label htmlFor="job-id">Job ID</Label>
          <Input
            id="job-id"
            placeholder="00000000-0000-0000-0000-000000000000"
            value={jobId}
            disabled={isSearching}
            onChange={(event) => setJobId(event.target.value)}
          />
        </div>
        <Button size="sm" type="submit" disabled={isSearching || !jobId.trim()}>
          {isSearching ? (
            <Spinner size="sm" color="light" label="Consultando..." showLabel />
          ) : (
            "Consultar"
          )}
        </Button>
      </form>

      <div className="custom-scrollbar mt-6 max-h-[55vh] overflow-y-auto px-2 pb-3">
        {error && (
          <Alert variant="error" title="Não foi possível consultar" message={error} />
        )}

        {result && (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="text-base font-medium text-gray-800 dark:text-white/90">
                {TYPE_LABELS[result.type]} encontrado
              </span>
              <EnrichmentStatusBadge status={result.status} />
            </div>
            <RecordFields record={result[result.type]} />
          </>
        )}
      </div>
    </>
  );
}

// Consulta um cadastro pelo jobId retornado quando a requisição caiu na fila
// (limite de requisições da API externa atingido).
export default function JobLookupModal({ isOpen, initialJobId = "", onClose, onFound }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-[900px]">
      {isOpen && (
        <div className="relative w-full rounded-3xl bg-white p-4 lg:p-11 dark:bg-gray-900">
          <div className="px-2 pe-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Consultar cadastro por jobId
            </h4>
            <p className="mb-6 text-sm text-gray-500 lg:mb-7 dark:text-gray-400">
              Use o jobId recebido quando o cadastro foi enviado para a fila.
            </p>
          </div>
          <JobLookupContent initialJobId={initialJobId} onFound={onFound} />
        </div>
      )}
    </Modal>
  );
}
