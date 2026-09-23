import Image from "next/image";
import Link from "next/link";
import GridShape from "@/components/common/grid-shape.component";
import ThemeTogglerFloating from "@/components/common/theme-toggler-floating.component";
import { PUBLIC_ROUTES } from "@/config/routes.config";

// Layout das páginas de autenticação (login, cadastro e redefinição de senha).
export default function AuthLayout({ children }) {
  return (
    <div className="relative z-1 bg-white p-6 sm:p-0 dark:bg-gray-900">
      <div className="relative flex h-screen w-full flex-col justify-center sm:p-0 lg:flex-row dark:bg-gray-900">
        {children}
        <div className="hidden h-full w-full items-center bg-brand-950 lg:grid lg:w-1/2 dark:bg-white/5">
          <div className="relative z-1 flex items-center justify-center">
            <GridShape />
            <div className="flex max-w-xs flex-col items-center">
              <Link href={PUBLIC_ROUTES.signin} className="mb-4 block">
                <Image
                  width={231}
                  height={48}
                  src="/images/logo/auth-logo.svg"
                  alt="Logo"
                />
              </Link>
              <p className="text-center text-gray-400 dark:text-white/60">
                Consultas de CEP, CNPJ e outros dados públicos do Brasil em um
                só lugar
              </p>
            </div>
          </div>
        </div>
        <div className="fixed right-6 bottom-6 z-50 hidden sm:block">
          <ThemeTogglerFloating />
        </div>
      </div>
    </div>
  );
}
