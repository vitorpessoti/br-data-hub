"use client";

import Link from "next/link";
import { useState } from "react";
import Input from "@/components/form/input/input-field.component";
import Label from "@/components/form/label.component";
import Alert from "@/components/ui/alert/alert.component";
import Button from "@/components/ui/button/button.component";
import Spinner from "@/components/ui/spinner/spinner.component";
import apiClient from "@/config/api-client.factory";
import { PUBLIC_ROUTES } from "@/config/routes.config";
import { isValidEmail } from "@/utils/validate-email.util";
import { ChevronLeftIcon } from "@/icons";

// A página de redefinição de senha do TailAdmin é exclusiva da versão Pro;
// este formulário segue o mesmo visual das páginas de login e cadastro.
export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorAlert, setErrorAlert] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setErrorAlert({
        title: "E-mail inválido",
        message: "Informe um e-mail válido para continuar.",
      });
      return;
    }

    setErrorAlert(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/auth/forgot-password", { email });
      setIsSent(true);
    } catch (error) {
      setErrorAlert({
        title: "Não foi possível enviar o e-mail",
        message: error.message,
      });
    } finally {
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
              Esqueceu sua senha?
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Informe o e-mail cadastrado e enviaremos um link para você
              redefinir sua senha.
            </p>
          </div>

          {isSent ? (
            <Alert
              variant="success"
              title="E-mail enviado"
              message={`Se existir uma conta para ${email}, você receberá as instruções de redefinição em alguns minutos.`}
            />
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-6">
                {errorAlert && (
                  <Alert
                    variant="error"
                    title={errorAlert.title}
                    message={errorAlert.message}
                  />
                )}
                <div>
                  <Label>
                    E-mail <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Digite seu e-mail"
                    defaultValue={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="sm"
                    disabled={isSubmitting || !email}
                  >
                    {isSubmitting ? (
                      <Spinner
                        size="sm"
                        color="light"
                        label="Enviando..."
                        showLabel
                      />
                    ) : (
                      "Enviar link de redefinição"
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
