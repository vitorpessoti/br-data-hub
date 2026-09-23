import ComponentCard from "@/components/common/component-card.component";
import PageBreadcrumb from "@/components/common/page-breadcrumb.component";
import Button from "@/components/ui/button/button.component";
import Spinner from "@/components/ui/spinner/spinner.component";

const SIZES = ["sm", "md", "lg", "xl"];
const COLORS = ["primary", "success", "error", "warning", "info", "dark"];

export default function SpinnersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Spinners" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Tamanhos">
          <div className="flex flex-wrap items-center gap-6">
            {SIZES.map((size) => (
              <Spinner key={size} size={size} />
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Cores">
          <div className="flex flex-wrap items-center gap-6">
            {COLORS.map((color) => (
              <Spinner key={color} color={color} />
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Variações">
          <div className="flex flex-wrap items-center gap-8">
            <Spinner variant="ring" size="lg" />
            <Spinner variant="dashed" size="lg" />
            <Spinner variant="dots" size="lg" />
          </div>
        </ComponentCard>

        <ComponentCard title="Com texto">
          <div className="flex flex-wrap items-center gap-8">
            <Spinner showLabel />
            <Spinner variant="dots" showLabel label="Processando consulta..." />
          </div>
        </ComponentCard>

        <ComponentCard title="Em botões">
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm" disabled>
              <Spinner size="sm" color="light" label="Salvando..." showLabel />
            </Button>
            <Button size="sm" variant="outline" disabled>
              <Spinner size="sm" label="Carregando..." showLabel />
            </Button>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
