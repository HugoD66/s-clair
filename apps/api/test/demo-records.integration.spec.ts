import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { Ajv } from 'ajv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { configureApp } from '../src/configure-app.js';

const fixture = { id: '10000000-0000-4000-8000-000000000001', label: 'Integration fixture' };
const missing = '10000000-0000-4000-8000-000000000002';
describe('HTTP / PostgreSQL contract', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;
  let validateRecord: ReturnType<Ajv['compile']>;
  let validateProblem: ReturnType<Ajv['compile']>;
  beforeAll(async () => {
    // Tests require the disposable database supplied by compose.test.yaml.
    const url = new URL(process.env['DATABASE_URL'] ?? '');
    if (url.pathname !== '/sclair_test') throw new Error('Integration tests require sclair_test');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    await prisma.demoRecord.create({ data: fixture });
    const contract = JSON.parse(
      await readFile(resolve('../../contracts/openapi.json'), 'utf8'),
    ) as { components: Record<string, unknown> };
    const ajv = new Ajv({
      strict: false,
      formats: { uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i },
    });
    validateRecord = ajv.compile({
      $ref: '#/components/schemas/DemoRecordDto',
      components: contract.components,
    });
    validateProblem = ajv.compile({
      $ref: '#/components/schemas/ProblemDto',
      components: contract.components,
    });
  });
  afterAll(async () => {
    if (prisma) await prisma.demoRecord.deleteMany({ where: { id: fixture.id } });
    if (app) await app.close();
  });
  it('returns an actual stored row matching the published contract', async () => {
    const response = await request(server).get(`/api/v1/demo-records/${fixture.id}`).expect(200);
    expect(response.body).toEqual(fixture);
    expect(validateRecord(response.body)).toBe(true);
  });
  it('returns a specific key and trace identifier for an absent UUID', async () => {
    const response = await request(server).get(`/api/v1/demo-records/${missing}`).expect(404);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({
      code: 'demoRecordNotFound',
      status: 404,
      requestId: response.headers['x-request-id'],
    });
    expect(validateProblem(response.body)).toBe(true);
  });
  it('rejects an invalid identifier without exposing SQL or request details', async () => {
    const response = await request(server).get('/api/v1/demo-records/not-a-uuid').expect(400);
    expect(response.body).toMatchObject({ code: 'validationError', detail: 'Invalid request.' });
    expect(validateProblem(response.body)).toBe(true);
  });
  it('exposes separate liveness and database readiness', async () => {
    await request(server).get('/api/v1/health/live').expect(200, { status: 'ok' });
    await request(server).get('/api/v1/health/ready').expect(200, { status: 'ok' });
  });
});
