import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { resolveJwtExpiresIn, resolveJwtSecret } from './jwt.constants';

/**
 * Módulo global de autenticação. Disponibiliza `JwtService` e o guard para
 * qualquer módulo de negócio, sem acoplar a base compartilhada a um domínio.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: resolveJwtSecret(),
        signOptions: { expiresIn: resolveJwtExpiresIn() },
      }),
    }),
  ],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class SharedAuthModule {}
