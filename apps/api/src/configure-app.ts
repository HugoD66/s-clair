import { randomUUID } from 'node:crypto';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ProblemFilter } from './common/problem.filter.js';
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new ProblemFilter());
  const logger = new Logger('HTTP');
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const start = performance.now();
    response.setHeader('x-request-id', requestId);
    response.on('finish', () =>
      logger.log({
        requestId,
        method: request.method,
        status: response.statusCode,
        durationMs: Math.round(performance.now() - start),
      }),
    );
    next();
  });
}
export function createDocument(app: INestApplication) {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('s-clair API').setVersion('1.0.0').build(),
  );
}
