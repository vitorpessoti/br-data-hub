"use client";

import Image from "next/image";
import Badge from "@/components/ui/badge/badge.component";
import DataTable from "@/components/ui/table/data-table.component";
import { QUERIES_MOCK, QUERY_STATUS_MOCK } from "@/mocks/queries.mock";

// Formata "AAAA-MM-DDTHH:mm:ss" como "DD/MM/AAAA HH:mm" sem depender do fuso do ambiente.
const formatDateTime = (value) => {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} ${time.slice(0, 5)}`;
};

const columns = [
  {
    key: "user",
    header: "Usuário",
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full">
          <Image width={40} height={40} src={row.userImage} alt={row.user} />
        </div>
        <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {row.user}
        </span>
      </div>
    ),
  },
  {
    key: "type",
    header: "Tipo",
    sortable: true,
    render: (row) => (
      <Badge size="sm" color={row.type === "CEP" ? "primary" : "info"}>
        {row.type}
      </Badge>
    ),
  },
  { key: "value", header: "Consulta", sortable: true },
  { key: "source", header: "Origem", sortable: true },
  {
    key: "requestedAt",
    header: "Data",
    sortable: true,
    render: (row) => formatDateTime(row.requestedAt),
  },
  {
    key: "duration",
    header: "Tempo",
    sortable: true,
    render: (row) => `${row.duration} ms`,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    sortValue: (row) => QUERY_STATUS_MOCK[row.status].label,
    render: (row) => (
      <Badge size="sm" color={QUERY_STATUS_MOCK[row.status].color}>
        {QUERY_STATUS_MOCK[row.status].label}
      </Badge>
    ),
  },
];

export default function QueriesTable() {
  return (
    <DataTable
      title="Consultas recentes"
      columns={columns}
      data={QUERIES_MOCK}
      searchKeys={["user", "type", "value", "source"]}
      searchPlaceholder="Buscar por usuário, tipo ou consulta..."
      pageSizeOptions={[5, 10, 25]}
      initialPageSize={10}
    />
  );
}
