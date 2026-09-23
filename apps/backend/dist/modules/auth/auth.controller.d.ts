import { ConfigService } from '@nestjs/config';
import type { LoginUserIn, RegisterUserIn } from '@br-data-hub/auth';
import { BcryptCryptoProvider } from './bcrypt.crypto';
import { PrismaUserRepository } from './user.prisma';
export declare class AuthController {
    private readonly cryptoProvider;
    private readonly userRepository;
    private readonly configService;
    constructor(cryptoProvider: BcryptCryptoProvider, userRepository: PrismaUserRepository, configService: ConfigService);
    registerUser(body: RegisterUserIn): Promise<{
        message: string;
    }>;
    loginUser(body: LoginUserIn): Promise<{
        token: string;
        user: import("@br-data-hub/auth").LoginUserOut;
    }>;
    private resolveJwtSecret;
}
