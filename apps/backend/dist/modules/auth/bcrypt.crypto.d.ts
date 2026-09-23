import { CryptoProvider } from '@br-data-hub/auth';
export declare class BcryptCryptoProvider implements CryptoProvider {
    encrypt(password: string): Promise<string>;
    compare(password: string, hashedPassword: string): Promise<boolean>;
}
