/**
 * Payload decodificado do JWT. Mantido aberto de propósito: a skill não deve
 * assumir detalhes rígidos além de um identificador do usuário (`sub`).
 */
export interface JwtPayload {
  sub?: string;
  [claim: string]: unknown;
}
