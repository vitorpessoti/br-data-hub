import RecordTableWidget from "@/modules/dashboard/components/record-table-widget.component";

// Dashboard inicial: CEPs e CNPJs cadastrados na base.
export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <RecordTableWidget resourceKey="cep" />
      </div>

      <div className="col-span-12">
        <RecordTableWidget resourceKey="cnpj" />
      </div>
    </div>
  );
}
