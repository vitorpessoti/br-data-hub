"use client";
import Checkbox from "@/components/form/input/checkbox.component";
import Input from "@/components/form/input/input-field.component";
import Label from "@/components/form/label.component";
import Alert from "@/components/ui/alert/alert.component";
import Button from "@/components/ui/button/button.component";
import Spinner from "@/components/ui/spinner/spinner.component";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import apiClient from "@/config/api-client.factory";
import { HOME_ROUTE, PUBLIC_ROUTES } from "@/config/routes.config";
import { saveSession } from "@/stores/session.store";
import { isValidEmail } from "@/utils/validate-email.util";
import { EyeCloseIcon, EyeIcon } from "@/icons";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setAlert({
        variant: "error",
        title: "E-mail inválido",
        message: "Informe um e-mail válido para continuar.",
      });
      return;
    }

    if (!password) {
      setAlert({
        variant: "error",
        title: "Senha obrigatória",
        message: "Informe sua senha para continuar.",
      });
      return;
    }

    setAlert(null);
    setIsSubmitting(true);

    try {
      const { token, user } = await apiClient.post("/auth/login", {
        email,
        password,
      });

      saveSession({ token, user }, { remember: isChecked });
      router.push(HOME_ROUTE);
    } catch (error) {
      setAlert({
        variant: "error",
        title: "Não foi possível entrar",
        message: error.message,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
              Entrar
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Informe seu e-mail e senha para entrar!
            </p>
          </div>
          <div>
            {alert && (
              <div className="mb-5">
                <Alert
                  variant={alert.variant}
                  title={alert.title}
                  message={alert.message}
                />
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-6">
                <div>
                  <Label>
                    E-mail <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="info@gmail.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label>
                    Senha <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isSubmitting}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-e-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block text-theme-sm font-normal text-gray-700 dark:text-gray-400">
                      Manter conectado
                    </span>
                  </div>
                  <Link
                    href={PUBLIC_ROUTES.resetPassword}
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Spinner
                        size="sm"
                        color="light"
                        label="Entrando..."
                        showLabel
                      />
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
                Não tem uma conta?{" "}
                <Link
                  href={PUBLIC_ROUTES.signup}
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Cadastre-se
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
