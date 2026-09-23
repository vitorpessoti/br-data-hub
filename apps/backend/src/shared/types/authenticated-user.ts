import { JwtPayload } from './jwt-payload';

/**
 * Usuário autenticado exposto no request após o guard validar o token.
 * `id` é normalizado a partir de `sub` (ou de um `id` já presente no payload).
 */
export type AuthenticatedUser = JwtPayload & {
  id: string;
};
