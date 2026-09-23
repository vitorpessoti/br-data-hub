"use client";
import Input from "@/components/form/input/input-field.component";
import Label from "@/components/form/label.component";
import Alert from "@/components/ui/alert/alert.component";
import Button from "@/components/ui/button/button.component";
import Spinner from "@/components/ui/spinner/spinner.component";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import apiClient from "@/config/api-client.factory";
import { PUBLIC_ROUTES } from "@/config/routes.config";
import { isValidEmail } from "@/utils/validate-email.util";
import { getPasswordValidationErrors } from "@/utils/validate-password.util";
import { EyeCloseIcon, EyeIcon } from "@/icons";

const REDIRECT_DELAY_MS = 1500;

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
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

    const passwordErrors = getPasswordValidationErrors(password);
    if (passwordErrors.length > 0) {
      setAlert({
        variant: "error",
        title: "Senha fraca",
        message: passwordErrors.join(" "),
      });
      return;
    }

    setAlert(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/auth/register", { name, email, password });

      setAlert({
        variant: "success",
        title: "Cadastro realizado",
        message: "Sua conta foi criada com sucesso! Redirecionando para o login...",
      });

      setTimeout(() => router.push(PUBLIC_ROUTES.signin), REDIRECT_DELAY_MS);
    } catch (error) {
      setAlert({
        variant: "error",
        title: "Não foi possível concluir o cadastro",
        message: error.message,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="no-scrollbar flex w-full flex-1 flex-col overflow-y-auto lg:w-1/2">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
              Cadastro
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Informe seus dados para criar uma conta!
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
              <div className="space-y-5">
                {/* <!-- Name --> */}
                <div>
                  <Label>
                    Nome<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Digite seu nome"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    E-mail<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Digite seu e-mail"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {/* <!-- Password --> */}
                <div>
                  <Label>
                    Senha<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      placeholder="Digite sua senha"
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
                {/* <!-- Button --> */}
                <div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Spinner
                        size="sm"
                        color="light"
                        label="Cadastrando..."
                        showLabel
                      />
                    ) : (
                      "Cadastrar"
                    )}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
                Já tem uma conta?{" "}
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
    </div>
  );
}
