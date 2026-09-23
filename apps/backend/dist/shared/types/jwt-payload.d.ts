export interface JwtPayload {
    sub?: string;
    [claim: string]: unknown;
}
