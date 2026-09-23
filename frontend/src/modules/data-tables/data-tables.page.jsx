import ComponentCard from "@/components/common/component-card.component";
import PageBreadcrumb from "@/components/common/page-breadcrumb.component";
import BasicTable from "@/modules/data-tables/components/basic-table.component";
import QueriesTable from "@/modules/data-tables/components/queries-table.component";

export default function DataTablesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Tabelas" />
      <div className="space-y-6">
        <QueriesTable />
        <ComponentCard title="Tabela básica">
          <BasicTable />
        </ComponentCard>
      </div>
    </div>
  );
}
