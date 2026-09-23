export const PASSWORD_MIN_LENGTH = 8;

const RULES = [
  {
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
    message: `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`,
  },
  {
    test: (password) => /[A-Z]/.test(password),
    message: "A senha deve ter ao menos uma letra maiúscula.",
  },
  {
    test: (password) => /[a-z]/.test(password),
    message: "A senha deve ter ao menos uma letra minúscula.",
  },
  {
    test: (password) => /[0-9]/.test(password),
    message: "A senha deve ter ao menos um número.",
  },
  {
    test: (password) => /[^A-Za-z0-9]/.test(password),
    message: "A senha deve ter ao menos um caractere especial.",
  },
];

export function getPasswordValidationErrors(password) {
  const value = typeof password === "string" ? password : "";
  return RULES.filter((rule) => !rule.test(value)).map((rule) => rule.message);
}

export function isStrongPassword(password) {
  return getPasswordValidationErrors(password).length === 0;
}
