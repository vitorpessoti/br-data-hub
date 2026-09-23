import ComponentCard from "@/components/common/component-card.component";
import PageBreadcrumb from "@/components/common/page-breadcrumb.component";
import Alert from "@/components/ui/alert/alert.component";
export default function AlertsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Alertas" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Alerta de sucesso">
          <Alert
            variant="success"
            title="Mensagem de sucesso"
            message="Tenha cuidado ao realizar esta ação."
            showLink={true}
            linkHref="/"
            linkText="Saiba mais"
          />
          <Alert
            variant="success"
            title="Mensagem de sucesso"
            message="Tenha cuidado ao realizar esta ação."
            showLink={false}
          />
        </ComponentCard>
        <ComponentCard title="Alerta de aviso">
          <Alert
            variant="warning"
            title="Mensagem de aviso"
            message="Tenha cuidado ao realizar esta ação."
            showLink={true}
            linkHref="/"
            linkText="Saiba mais"
          />
          <Alert
            variant="warning"
            title="Mensagem de aviso"
            message="Tenha cuidado ao realizar esta ação."
            showLink={false}
          />
        </ComponentCard>{" "}
        <ComponentCard title="Alerta de erro">
          <Alert
            variant="error"
            title="Mensagem de erro"
            message="Tenha cuidado ao realizar esta ação."
            showLink={true}
            linkHref="/"
            linkText="Saiba mais"
          />
          <Alert
            variant="error"
            title="Mensagem de erro"
            message="Tenha cuidado ao realizar esta ação."
            showLink={false}
          />
        </ComponentCard>{" "}
        <ComponentCard title="Alerta de informação">
          <Alert
            variant="info"
            title="Mensagem informativa"
            message="Tenha cuidado ao realizar esta ação."
            showLink={true}
            linkHref="/"
            linkText="Saiba mais"
          />
          <Alert
            variant="info"
            title="Mensagem informativa"
            message="Tenha cuidado ao realizar esta ação."
            showLink={false}
          />
        </ComponentCard>
      </div>
    </div>
  );
}
