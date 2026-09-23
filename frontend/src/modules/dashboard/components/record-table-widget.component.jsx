"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@/components/ui/alert/alert.component";
import Button from "@/components/ui/button/button.component";
import DataTable from "@/components/ui/table/data-table.component";
import apiClient from "@/config/api-client.factory";
import { EyeIcon, PencilIcon, PlusIcon, TimeIcon, TrashBinIcon } from "@/icons";
import CreateRecordModal from "@/modules/dashboard/components/create-record-modal.component";
import DeleteRecordModal from "@/modules/dashboard/components/delete-record-modal.component";
import EnrichmentStatusBadge from "@/modules/dashboard/components/enrichment-status-badge.component";
import JobLookupModal from "@/modules/dashboard/components/job-lookup-modal.component";
import RecordDetailsModal from "@/modules/dashboard/components/record-details-modal.component";
import { RECORD_RESOURCES } from "@/modules/dashboard/config/record-resources.config";
import { EMPTY_VALUE } from "@/utils/format-field.util";

const CLOSED_DETAILS = { record: null, mode: "view" };
const CLOSED_JOB_LOOKUP = { isOpen: false, jobId: "" };

function ActionButton({ label, onClick, danger = false, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 ${
        danger
          ? "hover:text-error-500"
          : "hover:text-gray-700 dark:hover:text-white/90"
      }`}
    >
      {children}
    </button>
  );
}

// Widget do dashboard com a tabela dos CEPs ou CNPJs cadastrados na base,
// com ações de visualizar, alterar e excluir e a consulta por jobId.
// Recebe só a chave do recurso ("cep" | "cnpj"): a configuração tem funções,
// que não podem ser passadas de um Server Component.
export default function RecordTableWidget({ resourceKey }) {
  const resource = RECORD_RESOURCES[resourceKey];
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [details, setDetails] = useState(CLOSED_DETAILS);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [jobLookup, setJobLookup] = useState(CLOSED_JOB_LOOKUP);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Começa com `isLoading` true; o "Atualizar" liga o loading antes de recarregar.
  const loadRecords = useCallback(
    () =>
      apiClient
        .get(resource.path)
        .then((data) => setRecords(data[resource.listKey]))
        .catch((error) =>
          setAlert({
            variant: "error",
            title: `Não foi possível carregar os ${resource.label}s`,
            message: error.message,
          }),
        )
        .finally(() => setIsLoading(false)),
    [resource],
  );

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const formattedId = (record) => resource.formatId(record[resource.key]);

  const replaceRecord = (record) =>
    setRecords((prev) =>
      prev.map((item) => (item.id === record.id ? record : item)),
    );

  const handleRefresh = () => {
    setAlert(null);
    setIsLoading(true);
    loadRecords();
  };

  // Na fila (limite da API externa), o backend responde 202 só com o jobId e o
  // valor cru ({ jobId, status, cep }), sem o registro: recarrega a tabela para
  // exibir a linha pendente. Senão, inclui (ou atualiza) a linha com os dados.
  const handleCreated = (data) => {
    setIsCreateOpen(false);
    if (data.jobId) {
      setAlert({
        variant: "info",
        title: `${resource.label} enviado para a fila`,
        message: `O limite de consultas foi atingido e o ${resource.label} ${resource.formatId(data[resource.key])} será processado em seguida. jobId: ${data.jobId}`,
      });
      setIsLoading(true);
      loadRecords();
      return;
    }

    const record = data[resource.key];
    setRecords((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
    setAlert({
      variant: "success",
      title: `${resource.label} cadastrado`,
      message: `O ${resource.label} ${formattedId(record)} foi cadastrado com sucesso.`,
    });
  };

  const handleSaved = (record) => {
    replaceRecord(record);
    setDetails(CLOSED_DETAILS);
    setAlert({
      variant: "success",
      title: `${resource.label} atualizado`,
      message: `O ${resource.label} ${formattedId(record)} foi atualizado com sucesso.`,
    });
  };

  const handleDeleted = (record) => {
    setRecords((prev) => prev.filter((item) => item.id !== record.id));
    setRecordToDelete(null);
    setAlert({
      variant: "success",
      title: `${resource.label} excluído`,
      message: `O ${resource.label} ${formattedId(record)} foi excluído.`,
    });
  };

  // Mantém a linha em dia com o status consultado pelo jobId.
  const handleJobFound = (type, record) => {
    if (type === resource.key) replaceRecord(record);
  };

  const columns = [
    {
      key: resource.key,
      header: resource.label,
      sortable: true,
      className: "whitespace-nowrap",
      render: (row) => (
        <span className="font-medium text-gray-800 dark:text-white/90">
          {formattedId(row)}
        </span>
      ),
    },
    ...resource.columns.map((column) => ({
      ...column,
      sortable: true,
      render: (row) => row[column.key] || EMPTY_VALUE,
    })),
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <EnrichmentStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Ações",
      render: (row) => (
        <div className="flex items-center gap-1">
          <ActionButton
            label={`Visualizar ${resource.label} ${formattedId(row)}`}
            onClick={() => setDetails({ record: row, mode: "view" })}
          >
            <EyeIcon className="size-5 fill-current" />
          </ActionButton>
          <ActionButton
            label={`Alterar ${resource.label} ${formattedId(row)}`}
            onClick={() => setDetails({ record: row, mode: "edit" })}
          >
            <PencilIcon className="size-5 fill-current" />
          </ActionButton>
          <ActionButton
            label={`Excluir ${resource.label} ${formattedId(row)}`}
            onClick={() => setRecordToDelete(row)}
            danger
          >
            <TrashBinIcon className="size-5 fill-current" />
          </ActionButton>
          {row.jobId && (
            <ActionButton
              label={`Consultar jobId do ${resource.label} ${formattedId(row)}`}
              onClick={() => setJobLookup({ isOpen: true, jobId: row.jobId })}
            >
              <TimeIcon className="size-5 fill-current" />
            </ActionButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {alert && (
        <Alert
          variant={alert.variant}
          title={alert.title}
          message={alert.message}
        />
      )}

      <DataTable
        title={resource.title}
        actions={
          <>
            <Button
              size="sm"
              startIcon={<PlusIcon className="size-4" />}
              onClick={() => setIsCreateOpen(true)}
            >
              Novo {resource.label}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setJobLookup({ isOpen: true, jobId: "" })}
            >
              Consultar por jobId
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Atualizar
            </Button>
          </>
        }
        columns={columns}
        data={records}
        searchKeys={[
          resource.key,
          ...resource.columns.map((column) => column.key),
        ]}
        searchPlaceholder={`Buscar ${resource.label}...`}
        loading={isLoading}
        emptyMessage={`Nenhum ${resource.label} cadastrado.`}
      />

      <RecordDetailsModal
        resource={resource}
        record={details.record}
        mode={details.mode}
        onClose={() => setDetails(CLOSED_DETAILS)}
        onSaved={handleSaved}
      />

      <CreateRecordModal
        resource={resource}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      <DeleteRecordModal
        resource={resource}
        record={recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onDeleted={handleDeleted}
      />

      <JobLookupModal
        isOpen={jobLookup.isOpen}
        initialJobId={jobLookup.jobId}
        onClose={() => setJobLookup(CLOSED_JOB_LOOKUP)}
        onFound={handleJobFound}
      />
    </div>
  );
}
