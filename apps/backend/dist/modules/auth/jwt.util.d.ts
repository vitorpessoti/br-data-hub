export interface TokenUser {
    id: string;
    name: string;
    email: string;
}
export declare function signUserToken(user: TokenUser, secret: string): string;
