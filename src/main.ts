import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.PORT', 3000);

  await app.listen(port);
  logger.log(`🚀 Provider Data Factory service listening on http://localhost:${port}`);
  logger.log(`📌 Health check available at: http://localhost:${port}/health`);
  logger.log(`📌 Trigger run endpoint: POST http://localhost:${port}/runs`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during application bootstrap:', err);
  process.exit(1);
});
