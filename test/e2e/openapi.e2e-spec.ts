import { writeFileSync } from 'node:fs';
import request from 'supertest';
import { configureOpenApi } from '../../src/bootstrap/openapi.js';
import { startApp, type E2eApp } from './support/app.js';

type Schema = { type?: string; items?: Schema; $ref?: string; properties?: Record<string, Schema> };
type Operation = { security?: unknown[]; responses: Record<string, unknown> };
type Document = { paths: Record<string, Record<string, Operation>>; components: { schemas: Record<string, Schema> } };

// The OpenAPI document describes what the API answers (spec 021, block D).
describe('OpenAPI (e2e)', () => {
  let e2e: E2eApp;
  let doc: Document;

  beforeAll(async () => {
    e2e = await startApp({}, app => configureOpenApi(app));
    doc = (await request(e2e.server).get('/api-spec')).body as Document;
    // OPENAPI_DUMP=<file> keeps the document, to compare it before and after a change (jq -S).
    if (process.env.OPENAPI_DUMP) writeFileSync(process.env.OPENAPI_DUMP, JSON.stringify(doc));
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  it('documents the health check without security', () => {
    expect(doc.paths['/v1/health'].get.security).toBeUndefined();
    expect(doc.paths['/v1/strategic-games'].get.security).toEqual([{ oauth2: [], 'access-token': [] }]);
  });

  it('describes the content of each page as an array of its items, not an array of arrays [F-strategic-05]', () => {
    for (const name of ['GamePageDto', 'FactionPageDto', 'CharacterPageDto', 'ItemPageDto']) {
      const content = doc.components.schemas[name].properties!.content;
      expect([name, content.type, content.items?.type]).toEqual([name, 'array', undefined]);
      expect(content.items?.$ref).toBeDefined();
    }
  });

  it('documents a 201 for each create', () => {
    for (const path of ['/v1/strategic-games', '/v1/factions', '/v1/characters', '/v1/items']) {
      expect([path, Object.keys(doc.paths[path].post.responses)]).toEqual([path, expect.arrayContaining(['201'])]);
    }
  });

  it('documents shortDescription and accessType of a game [F-strategic-17]', () => {
    expect(Object.keys(doc.components.schemas.GameDto.properties!)).toEqual(expect.arrayContaining(['shortDescription', 'accessType']));
  });
});
