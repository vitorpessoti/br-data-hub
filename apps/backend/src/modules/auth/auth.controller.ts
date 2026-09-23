import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginUser, RegisterUser } from '@br-data-hub/auth';
import type { LoginUserIn, RegisterUserIn } from '@br-data-hub/auth';
import { BcryptCryptoProvider } from './bcrypt.crypto';
import { signUserToken } from './jwt.util';
import { PrismaUserRepository } from './user.prisma';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly cryptoProvider: BcryptCryptoProvider,
    private readonly userRepository: PrismaUserRepository,
    private readonly configService: ConfigService,
  ) {}

  @Post('/register')
  async registerUser(@Body() body: RegisterUserIn) {
    const useCase = new RegisterUser(this.cryptoProvider, this.userRepository);

    await useCase.execute(body);

    return { message: 'User registered successfully' };
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async loginUser(@Body() body: LoginUserIn) {
    const useCase = new LoginUser(this.cryptoProvider, this.userRepository);

    // O caso de uso devolve só os atributos públicos do usuário; o token é
    // emitido aqui, na camada HTTP, a partir dessa saída.
    const user = await useCase.execute(body);
    const token = signUserToken(user, this.resolveJwtSecret());

    return { token, user };
  }

  private resolveJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not defined.');
    }

    return secret;
  }
}
