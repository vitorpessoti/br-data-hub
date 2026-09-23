import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './shared/errors/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalFilters(new DomainExceptionFilter());
  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
