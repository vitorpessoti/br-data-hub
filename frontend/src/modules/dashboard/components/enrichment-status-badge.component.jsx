import Badge from "@/components/ui/badge/badge.component";
import { formatStatus } from "@/utils/format-field.util";

// Cor do status do enriquecimento do CEP/CNPJ na API externa (chamada direta ou fila).
const STATUS_COLORS = {
  pending: "warning",
  processing: "info",
  completed: "success",
  failed: "error",
};

export default function EnrichmentStatusBadge({ status }) {
  return (
    <Badge size="sm" color={STATUS_COLORS[status] ?? "light"}>
      {formatStatus(status)}
    </Badge>
  );
}
