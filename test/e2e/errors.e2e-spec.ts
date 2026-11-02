import request from 'supertest';
import { startApp, type E2eApp } from './support/app.js';

// One error format for every failure (spec 020, phase 5), in a file of its own: the AppModule reads its environment once.
describe('error format', () => {
  let e2e: E2eApp;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  it('answers domain errors, validation errors and a missing token with statusCode, error, code, message, timestamp and path', async () => {
    const missing = await request(e2e.server).get('/v1/characters/character-missing').set('Authorization', e2e.auth('owner'));
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({
      statusCode: 404,
      error: 'NotFoundError',
      code: 'not-found',
      path: '/v1/characters/character-missing',
    });
    expect(typeof (missing.body as { timestamp: unknown }).timestamp).toBe('string');
    expect(missing.body).not.toHaveProperty('errorCode');

    const invalid = await request(e2e.server).post('/v1/factions').set('Authorization', e2e.auth('owner')).send({});
    expect(invalid.body).toMatchObject({ statusCode: 400, error: 'BadRequestException', code: 'bad-request' });
    expect(Array.isArray((invalid.body as { message: unknown }).message)).toBe(true);

    const anonymous = await request(e2e.server).get('/v1/factions');
    expect(anonymous.body).toMatchObject({ statusCode: 401, code: 'unauthorized' });
  });

  it('reports the path without the query string [F-receta-22]', async () => {
    const response = await request(e2e.server).get('/v1/characters?size=1001&q=name==x').set('Authorization', e2e.auth('owner'));
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ path: '/v1/characters' });
  });

  it('sends the rule code in code only, which rmu-mfe-strategic translates [F-receta-33]', async () => {
    // A rule error of the tactical outcome: the character of the outcome is not the one of the path
    const response = await request(e2e.server)
      .post('/v1/characters/character-a/tactical-outcomes')
      .set('Authorization', e2e.auth('service'))
      .send({ tacticalGameId: 't-1', actorId: 'a-1', characterId: 'character-b', hp: { start: 1, end: 1, delta: 0 }, injuries: [] });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'err-outcome-character-mismatch' });
    expect(response.body).not.toHaveProperty('errorCode');
  });
});
