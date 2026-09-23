import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { CepModule } from '../cep/cep.module';
import { CnpjModule } from '../cnpj/cnpj.module';
import { BrDataEnrichmentProcessor } from './br-data-enrichment.processor';
import { BrDataEnrichmentWorker } from './br-data-enrichment.worker';
import { BrDataController } from './br-data.controller';
import { PrismaBrDataRepository } from './br-data.prisma';
import { BullMqBrDataEnrichmentProvider } from './bullmq.br-data-enrichment';

@Module({
  imports: [DbModule, CepModule, CnpjModule],
  controllers: [BrDataController],
  providers: [
    PrismaBrDataRepository,
    BullMqBrDataEnrichmentProvider,
    BrDataEnrichmentProcessor,
    BrDataEnrichmentWorker,
  ],
})
export class BrDataModule {}
