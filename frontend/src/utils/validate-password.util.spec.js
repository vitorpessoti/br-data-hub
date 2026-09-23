import {
  PASSWORD_MIN_LENGTH,
  getPasswordValidationErrors,
  isStrongPassword,
} from "./validate-password.util";

describe("# validate-password.util", () => {
  it("should return no errors for a strong password", () => {
    expect(getPasswordValidationErrors("Str0ng!Pass")).toEqual([]);
    expect(isStrongPassword("Str0ng!Pass")).toBe(true);
  });

  it("should require at least the minimum length", () => {
    const errors = getPasswordValidationErrors("Ab1!");
    expect(errors).toContain(
      `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`,
    );
  });

  it("should require an uppercase letter", () => {
    expect(getPasswordValidationErrors("lowercase1!")).toContain(
      "A senha deve ter ao menos uma letra maiúscula.",
    );
  });

  it("should require a lowercase letter", () => {
    expect(getPasswordValidationErrors("UPPERCASE1!")).toContain(
      "A senha deve ter ao menos uma letra minúscula.",
    );
  });

  it("should require a number", () => {
    expect(getPasswordValidationErrors("NoNumbers!")).toContain(
      "A senha deve ter ao menos um número.",
    );
  });

  it("should require a special character", () => {
    expect(getPasswordValidationErrors("NoSpecial1")).toContain(
      "A senha deve ter ao menos um caractere especial.",
    );
  });

  it("should treat a non-string value as an empty password", () => {
    expect(getPasswordValidationErrors(undefined)).toHaveLength(5);
    expect(isStrongPassword(null)).toBe(false);
  });

  it("should accumulate every unmet rule", () => {
    expect(getPasswordValidationErrors("")).toHaveLength(5);
  });
});
