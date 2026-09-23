import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { CepModule } from './modules/cep/cep.module';
import { CnpjModule } from './modules/cnpj/cnpj.module';
import { BrDataModule } from './modules/br-data/br-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    DbModule,
    AuthModule,
    CepModule,
    CnpjModule,
    BrDataModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
