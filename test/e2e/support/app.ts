import type { NestExpressApplication } from '@nestjs/platform-express';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { configureHttp } from '../../../src/bootstrap/http.js';
import { REALM_CLIENT } from '../../../src/modules/games/application/ports/realm-client.port.js';
import { NPC_CLIENT } from '../../../src/modules/factions/application/ports/npc-client.port.js';
import { ITEM_CLIENT } from '../../../src/modules/items/application/ports/item-client.port.js';
import { RACE_CLIENT } from '../../../src/modules/characters/application/ports/race-client.port.js';
import { SKILL_CLIENT } from '../../../src/modules/characters/application/ports/skill-client.port.js';
import { ENUMERATION_CLIENT } from '../../../src/modules/characters/application/ports/enumeration-client.port.js';
import { SKILL_CATEGORY_CLIENT } from '../../../src/modules/characters/application/ports/skill-category-client.port.js';
import { PROFESSION_CLIENT } from '../../../src/modules/characters/application/ports/profession-client.port.js';
import { TRAIT_CLIENT } from '../../../src/modules/characters/application/ports/trait-client.port.js';
import { CULTURE_CLIENT } from '../../../src/modules/characters/application/ports/culture-client.port.js';
import { FIGHTING_STYLES_CLIENT } from '../../../src/modules/characters/application/ports/fighting-styles-client.port.js';
import { HEALING_TABLES_CLIENT } from '../../../src/modules/characters/application/ports/healing-tables-client.port.js';
import { POISON_RULES_CLIENT } from '../../../src/modules/characters/application/ports/poison-rules-client.port.js';
import { SPELL_LIST_CLIENT } from '../../../src/modules/characters/application/ports/spell-list-client.port.js';
import { MANEUVER_CLIENT } from '../../../src/modules/characters/application/ports/maneuver-client.port.js';
import { MATERIAL_CLIENT } from '../../../src/modules/items/application/ports/material-client.port.js';
import { TRADING_TABLES_CLIENT } from '../../../src/modules/items/application/ports/trading-tables-client.port.js';
import { DOMAIN_EVENT_PUBLISHER } from '../../../src/modules/shared/application/ports/domain-event-publisher.port.js';
import { KafkaProducerService } from '../../../src/modules/shared/infrastructure/messaging/kafka-producer.service.js';
import { apiFakes, InMemoryEventPublisher } from './fakes.js';
import { AUDIENCE, ISSUER, LocalJwks } from './jwks.js';

export type Server = Parameters<typeof request>[0];

export const SERVICE_CLIENT_ID = 'rmu-api-strategic-e2e';

/** The users of the suite, by the Keycloak groups in their token. `service` is the client credentials token of an API. */
export const USERS = {
  admin: { sub: 'e2e-admin', groups: ['rmu-admin'] },
  owner: { sub: 'e2e-owner', groups: ['rmu-user'] },
  other: { sub: 'e2e-other', groups: ['rmu-user'] },
  noRole: { sub: 'e2e-guest', groups: [] as string[] },
  service: { sub: 'e2e-service', groups: [] as string[], azp: SERVICE_CLIENT_ID },
} as const;

export type UserName = keyof typeof USERS;

export type E2eApp = {
  app: NestExpressApplication;
  server: Server;
  jwks: LocalJwks;
  events: InMemoryEventPublisher;
  auth: (user: UserName) => string;
  connection: Connection;
  /** Empties every collection and the published events, between tests. */
  clear: () => Promise<void>;
  stop: () => Promise<void>;
};

/**
 * Boots the whole AppModule as main.ts does (configureHttp) against an in-memory Mongo and a local JWKS. The ports of
 * the APIs strategic calls (core, items, spells and npcs) answer from in-memory fakes, the domain events are kept in memory and the
 * Kafka producer is replaced. AppModule is imported after setting the environment, because ConfigModule.forRoot()
 * reads it when the module is evaluated.
 */
export async function startApp(env: Record<string, string> = {}, beforeInit?: (app: NestExpressApplication) => void): Promise<E2eApp> {
  const mongo = await MongoMemoryServer.create();
  const jwks = new LocalJwks();
  await jwks.start();
  Object.assign(process.env, {
    RMU_MONGO_STRATEGIC_URI: mongo.getUri('rmu-strategic-e2e'),
    RMU_API_CORE_URI: 'http://127.0.0.1:1/v1',
    RMU_API_ITEMS_URI: 'http://127.0.0.1:1/v1',
    RMU_API_SPELLS_URI: 'http://127.0.0.1:1/v1',
    RMU_API_NPCS_URI: 'http://127.0.0.1:1/v1',
    RMU_IAM_JWK_URI: jwks.uri,
    RMU_IAM_ISSUER_URI: ISSUER,
    RMU_IAM_AUDIENCE: AUDIENCE,
    RMU_IAM_TOKEN_URI: 'http://127.0.0.1:1/token',
    RMU_IAM_CLIENT_ID: SERVICE_CLIENT_ID,
    RMU_IAM_CLIENT_SECRET: 'e2e',
    RMU_KAFKA_BROKERS: 'localhost:9092',
    RMU_KAFKA_CLIENT_ID: 'rmu-api-strategic-e2e',
    RMU_KAFKA_CONSUMER_GROUP_ID: 'rmu-api-strategic-e2e',
    RMU_THROTTLE_LIMIT: '0',
    RMU_CORS_ORIGINS: '',
    ...env,
  });

  const fakes = apiFakes();
  const events = new InMemoryEventPublisher();
  const { AppModule } = await import('../../../src/app.module.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(KafkaProducerService)
    .useValue({ emit: () => Promise.resolve() })
    .overrideProvider(DOMAIN_EVENT_PUBLISHER)
    .useValue(events)
    .overrideProvider(REALM_CLIENT)
    .useValue(fakes.realmClient)
    .overrideProvider(NPC_CLIENT)
    .useValue(fakes.npcClient)
    .overrideProvider(ITEM_CLIENT)
    .useValue(fakes.itemClient)
    .overrideProvider(RACE_CLIENT)
    .useValue(fakes.raceClient)
    .overrideProvider(SKILL_CLIENT)
    .useValue(fakes.skillClient)
    .overrideProvider(SKILL_CATEGORY_CLIENT)
    .useValue(fakes.skillCategoryClient)
    .overrideProvider(PROFESSION_CLIENT)
    .useValue(fakes.professionClient)
    .overrideProvider(TRAIT_CLIENT)
    .useValue(fakes.traitClient)
    .overrideProvider(CULTURE_CLIENT)
    .useValue(fakes.cultureClient)
    .overrideProvider(HEALING_TABLES_CLIENT)
    .useValue(fakes.healingTablesClient)
    .overrideProvider(POISON_RULES_CLIENT)
    .useValue(fakes.poisonRulesClient)
    .overrideProvider(FIGHTING_STYLES_CLIENT)
    .useValue(fakes.fightingStylesClient)
    .overrideProvider(MANEUVER_CLIENT)
    .useValue(fakes.maneuverClient)
    .overrideProvider(MATERIAL_CLIENT)
    .useValue(fakes.materialClient)
    .overrideProvider(TRADING_TABLES_CLIENT)
    .useValue(fakes.tradingTablesClient)
    .overrideProvider(SPELL_LIST_CLIENT)
    .useValue(fakes.spellListClient)
    .overrideProvider(ENUMERATION_CLIENT)
    .useValue(fakes.enumerationClient)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error'] });
  configureHttp(app);
  beforeInit?.(app);
  await app.init();

  return {
    app,
    server: app.getHttpServer() as Server,
    jwks,
    events,
    auth: user => `Bearer ${jwks.token(USERS[user])}`,
    connection: app.get<Connection>(getConnectionToken()),
    clear: async () => {
      const connection = app.get<Connection>(getConnectionToken());
      await Promise.all(Object.values(connection.collections).map(collection => collection.deleteMany({})));
      events.clear();
    },
    stop: async () => {
      await app.close();
      await jwks.stop();
      await mongo.stop();
    },
  };
}

/** The ids of a page response. */
export const ids = (body: unknown) => (body as { content: { id: string }[] }).content.map(item => item.id);
