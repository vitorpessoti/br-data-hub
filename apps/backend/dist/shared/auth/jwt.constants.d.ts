import type { JwtSignOptions } from '@nestjs/jwt';
export type JwtExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;
export declare const JWT_DEFAULT_EXPIRES_IN: JwtExpiresIn;
export declare function resolveJwtSecret(): string;
export declare function resolveJwtExpiresIn(): JwtExpiresIn;
