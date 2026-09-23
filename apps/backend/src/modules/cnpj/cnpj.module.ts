import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { BrasilApiCnpjProvider } from './brasilapi.cnpj';
import { PrismaCnpjRepository } from './cnpj.prisma';

// Sem controller por enquanto: as rotas que recebem o CNPJ ficam para uma spec futura.
@Module({
  imports: [DbModule],
  providers: [BrasilApiCnpjProvider, PrismaCnpjRepository],
  exports: [BrasilApiCnpjProvider, PrismaCnpjRepository],
})
export class CnpjModule {}
