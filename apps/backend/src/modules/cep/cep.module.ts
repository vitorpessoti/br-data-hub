import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { PrismaCepRepository } from './cep.prisma';
import { ViaCepProvider } from './viacep.cep';

// Sem controller por enquanto: as rotas que recebem o CEP ficam para uma spec futura.
@Module({
  imports: [DbModule],
  providers: [ViaCepProvider, PrismaCepRepository],
  exports: [ViaCepProvider, PrismaCepRepository],
})
export class CepModule {}
