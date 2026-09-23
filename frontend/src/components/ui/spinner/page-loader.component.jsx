import Spinner from "@/components/ui/spinner/spinner.component";

// Carregamento de página inteira, usado nos arquivos loading.jsx das rotas.
export default function PageLoader({ label = "Carregando..." }) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}
