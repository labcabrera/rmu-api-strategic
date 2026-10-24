import { writeFileSync } from 'node:fs';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { KafkaProducerService } from '../../src/modules/shared/infrastructure/messaging/kafka-producer.service';

// Smoke test of the platform (spec 020, phase 1): the whole AppModule boots against an in-memory Mongo. The full
// suite, with tokens signed against a local JWKS, comes in phase 4.
describe('rmu-api-strategic (e2e)', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    Object.assign(process.env, {
      RMU_MONGO_STRATEGIC_URI: mongo.getUri('rmu-strategic-e2e'),
      RMU_API_CORE_URI: 'http://localhost:1/v1',
      RMU_API_ITEMS_URI: 'http://localhost:1/v1',
      RMU_IAM_JWK_URI: 'http://localhost:1/certs',
      RMU_IAM_ISSUER_URI: 'http://localhost/sso/realms/rmu',
      RMU_IAM_AUDIENCE: 'rmu-api',
      RMU_IAM_TOKEN_URI: 'http://localhost:1/token',
      RMU_IAM_CLIENT_ID: 'rmu-api-strategic-e2e',
      RMU_IAM_CLIENT_SECRET: 'e2e',
      RMU_KAFKA_BROKERS: 'localhost:9092',
      RMU_KAFKA_CLIENT_ID: 'rmu-api-strategic-e2e',
      RMU_KAFKA_CONSUMER_GROUP_ID: 'rmu-api-strategic-e2e',
    });
    const { AppModule } = await import('../../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KafkaProducerService)
      .useValue({ emit: () => Promise.resolve() })
      .compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    await app.init();
    // OPENAPI_DUMP=<file> writes the generated document, to compare the contract between phases (spec 020).
    if (process.env.OPENAPI_DUMP) {
      const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Strategic API').build());
      writeFileSync(process.env.OPENAPI_DUMP, JSON.stringify(document));
    }
  });

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  it('answers the health check', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/v1/health');
    expect(response.status).toBe(200);
    expect((response.body as { status: string }).status).toBe('ok');
  });

  it('rejects a request without a token', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/v1/strategic-games');
    expect(response.status).toBe(401);
  });
});
