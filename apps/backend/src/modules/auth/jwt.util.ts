import { sign } from 'jsonwebtoken';

/**
 * Helper exclusivo da camada HTTP do módulo `auth`.
 *
 * O módulo de negócio não conhece token, JWT nem sessão: o caso de uso devolve
 * apenas os atributos públicos do usuário e é aqui, já fora do domínio, que o
 * token é emitido. Por isso este arquivo NÃO é um provider de domínio e não é
 * exportado para `@br-data-hub/auth`.
 */
const EXPIRES_IN = '7d';

export interface TokenUser {
  id: string;
  name: string;
  email: string;
}

export function signUserToken(user: TokenUser, secret: string): string {
  // Payload mínimo: nada de senha ou hash trafega dentro do token.
  return sign({ sub: user.id, name: user.name, email: user.email }, secret, {
    expiresIn: EXPIRES_IN,
  });
}
