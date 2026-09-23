"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Input from "@/components/form/input/input-field.component";
import Label from "@/components/form/label.component";
import Alert from "@/components/ui/alert/alert.component";
import Button from "@/components/ui/button/button.component";
import Spinner from "@/components/ui/spinner/spinner.component";
import apiClient from "@/config/api-client.factory";
import { PUBLIC_ROUTES } from "@/config/routes.config";
import { getPasswordValidationErrors } from "@/utils/validate-password.util";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";

const REDIRECT_DELAY_MS = 1500;

export default function ResetPasswordConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setAlert({
        variant: "error",
        title: "Link inválido",
        message: "Este link de redefinição de senha é inválido ou está incompleto.",
      });
      return;
    }

    const passwordErrors = getPasswordValidationErrors(password);
    if (passwordErrors.length > 0) {
      setAlert({
        variant: "error",
        title: "Senha fraca",
        message: passwordErrors.join(" "),
      });
      return;
    }

    if (password !== confirmPassword) {
      setAlert({
        variant: "error",
        title: "As senhas não coincidem",
        message: "A confirmação deve ser igual à nova senha informada.",
      });
      return;
    }

    setAlert(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/auth/reset-password", { token, password });

      setIsSuccess(true);
      setAlert({
        variant: "success",
        title: "Senha redefinida",
        message: "Sua senha foi redefinida com sucesso! Redirecionando para o login...",
      });

      setTimeout(() => router.push(PUBLIC_ROUTES.signin), REDIRECT_DELAY_MS);
    } catch (error) {
      setAlert({
        variant: "error",
        title: "Não foi possível redefinir a senha",
        message: error.message,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href={PUBLIC_ROUTES.signin}
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Voltar para o login
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
              Redefinir senha
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Escolha uma nova senha para acessar sua conta.
            </p>
          </div>

          {alert && (
            <div className="mb-5">
              <Alert
                variant={alert.variant}
                title={alert.title}
                message={alert.message}
              />
            </div>
          )}

          {!isSuccess && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-6">
                <div>
                  <Label>
                    Nova senha <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      placeholder="Digite sua nova senha"
                      type={showPassword ? "text" : "password"}
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
                <div>
                  <Label>
                    Confirmar senha <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirme sua nova senha"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={isSubmitting}
                  />
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
                        label="Redefinindo..."
                        showLabel
                      />
                    ) : (
                      "Redefinir senha"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}

          <div className="mt-5">
            <p className="text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
              Lembrou sua senha?{" "}
              <Link
                href={PUBLIC_ROUTES.signin}
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
