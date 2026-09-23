import PageBreadcrumb from "@/components/common/page-breadcrumb.component";
import Badge from "@/components/ui/badge/badge.component";
import { PlusIcon } from "@/icons";
export default function BadgesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Badges" />
      <div className="space-y-5 sm:space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Com fundo claro
            </h3>
          </div>

          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              {/* Light Variant */}
              <Badge variant="light" color="primary">
                Primário
              </Badge>
              <Badge variant="light" color="success">
                Sucesso
              </Badge>{" "}
              <Badge variant="light" color="error">
                Erro
              </Badge>{" "}
              <Badge variant="light" color="warning">
                Aviso
              </Badge>{" "}
              <Badge variant="light" color="info">
                Informação
              </Badge>
              <Badge variant="light" color="light">
                Claro
              </Badge>
              <Badge variant="light" color="dark">
                Escuro
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Com fundo sólido
            </h3>
          </div>
          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              {/* Light Variant */}
              <Badge variant="solid" color="primary">
                Primário
              </Badge>
              <Badge variant="solid" color="success">
                Sucesso
              </Badge>{" "}
              <Badge variant="solid" color="error">
                Erro
              </Badge>{" "}
              <Badge variant="solid" color="warning">
                Aviso
              </Badge>{" "}
              <Badge variant="solid" color="info">
                Informação
              </Badge>
              <Badge variant="solid" color="light">
                Claro
              </Badge>
              <Badge variant="solid" color="dark">
                Escuro
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Fundo claro com ícone à esquerda
            </h3>
          </div>
          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="light" color="primary" startIcon={<PlusIcon />}>
                Primário
              </Badge>
              <Badge variant="light" color="success" startIcon={<PlusIcon />}>
                Sucesso
              </Badge>{" "}
              <Badge variant="light" color="error" startIcon={<PlusIcon />}>
                Erro
              </Badge>{" "}
              <Badge variant="light" color="warning" startIcon={<PlusIcon />}>
                Aviso
              </Badge>{" "}
              <Badge variant="light" color="info" startIcon={<PlusIcon />}>
                Informação
              </Badge>
              <Badge variant="light" color="light" startIcon={<PlusIcon />}>
                Claro
              </Badge>
              <Badge variant="light" color="dark" startIcon={<PlusIcon />}>
                Escuro
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Fundo sólido com ícone à esquerda
            </h3>
          </div>
          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="solid" color="primary" startIcon={<PlusIcon />}>
                Primário
              </Badge>
              <Badge variant="solid" color="success" startIcon={<PlusIcon />}>
                Sucesso
              </Badge>{" "}
              <Badge variant="solid" color="error" startIcon={<PlusIcon />}>
                Erro
              </Badge>{" "}
              <Badge variant="solid" color="warning" startIcon={<PlusIcon />}>
                Aviso
              </Badge>{" "}
              <Badge variant="solid" color="info" startIcon={<PlusIcon />}>
                Informação
              </Badge>
              <Badge variant="solid" color="light" startIcon={<PlusIcon />}>
                Claro
              </Badge>
              <Badge variant="solid" color="dark" startIcon={<PlusIcon />}>
                Escuro
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Fundo claro com ícone à direita
            </h3>
          </div>
          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="light" color="primary" endIcon={<PlusIcon />}>
                Primário
              </Badge>
              <Badge variant="light" color="success" endIcon={<PlusIcon />}>
                Sucesso
              </Badge>{" "}
              <Badge variant="light" color="error" endIcon={<PlusIcon />}>
                Erro
              </Badge>{" "}
              <Badge variant="light" color="warning" endIcon={<PlusIcon />}>
                Aviso
              </Badge>{" "}
              <Badge variant="light" color="info" endIcon={<PlusIcon />}>
                Informação
              </Badge>
              <Badge variant="light" color="light" endIcon={<PlusIcon />}>
                Claro
              </Badge>
              <Badge variant="light" color="dark" endIcon={<PlusIcon />}>
                Escuro
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Fundo sólido com ícone à direita
            </h3>
          </div>
          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="solid" color="primary" endIcon={<PlusIcon />}>
                Primário
              </Badge>
              <Badge variant="solid" color="success" endIcon={<PlusIcon />}>
                Sucesso
              </Badge>{" "}
              <Badge variant="solid" color="error" endIcon={<PlusIcon />}>
                Erro
              </Badge>{" "}
              <Badge variant="solid" color="warning" endIcon={<PlusIcon />}>
                Aviso
              </Badge>{" "}
              <Badge variant="solid" color="info" endIcon={<PlusIcon />}>
                Informação
              </Badge>
              <Badge variant="solid" color="light" endIcon={<PlusIcon />}>
                Claro
              </Badge>
              <Badge variant="solid" color="dark" endIcon={<PlusIcon />}>
                Escuro
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
