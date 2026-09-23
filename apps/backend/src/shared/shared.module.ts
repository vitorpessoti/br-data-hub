import { Global, Module } from '@nestjs/common';
import { SharedAuthModule } from './auth/shared-auth.module';

/**
 * Agrega a infraestrutura compartilhada do backend. Global para que qualquer
 * módulo de negócio consuma a base de autenticação sem reimportar.
 */
@Global()
@Module({
  imports: [SharedAuthModule],
  exports: [SharedAuthModule],
})
export class SharedModule {}
