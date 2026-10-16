import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp, createDocument } from './configure-app.js';
const app = await NestFactory.create(AppModule, { logger: false });
try {
  configureApp(app);
  await writeFile(
    new URL('../../../contracts/openapi.json', import.meta.url),
    JSON.stringify(createDocument(app), null, 2) + '\n',
  );
} finally {
  await app.close();
}
