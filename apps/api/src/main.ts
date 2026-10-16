import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp, createDocument } from './configure-app.js';
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: new ConsoleLogger({ json: true }) });
  configureApp(app);
  if (process.env['NODE_ENV'] !== 'production')
    SwaggerModule.setup('api/docs', app, createDocument(app));
  app.enableShutdownHooks();
  await app.listen(3000, '0.0.0.0');
}
void bootstrap().catch(() => {
  console.error('API startup failed');
  process.exitCode = 1;
});
