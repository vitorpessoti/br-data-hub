import type { JwtSignOptions } from '@nestjs/jwt';

/**
 * Tipo aceito por `signOptions.expiresIn` na versão instalada do `@nestjs/jwt`
 * (não é `string` puro: é o literal de duração aceito pelo `ms`).
 */
export type JwtExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

export const JWT_DEFAULT_EXPIRES_IN: JwtExpiresIn = '1d';

/**
 * Lê o secret do ambiente. Nunca hardcodar segredo no código-fonte.
 */
export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined.');
  }

  return secret;
}

export function resolveJwtExpiresIn(): JwtExpiresIn {
  return (
    (process.env.JWT_EXPIRES_IN as JwtExpiresIn | undefined) ??
    JWT_DEFAULT_EXPIRES_IN
  );
}
