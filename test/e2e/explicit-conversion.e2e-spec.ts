import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createItem, gameBody, gameWithFaction } from './support/builders.js';

// Spec 044, fallo 10: the ValidationPipe no longer converts implicitly. Bodies are validated as they come, and the
// query and route values that are not strings are converted explicitly by their DTO or pipe.
describe('explicit conversion (e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;
  let factionId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    const { game, faction } = await gameWithFaction(e2e);
    gameId = game.id;
    factionId = faction.id;
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object = {}) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    put: (path: string) => request(e2e.server).put(path).set('Authorization', e2e.auth(user)),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
  });

  describe('bodies', () => {
    it('rejects a number in a string field instead of storing it as a string', async () => {
      const response = await as('owner').post('/v1/strategic-games', gameBody({ name: 42 }));
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ statusCode: 400 });
      expect((await as('owner').post('/v1/factions', { gameId, name: 42 })).status).toBe(400);
    });

    it('rejects the string "true" in a boolean field', async () => {
      const options = { experienceMultiplier: 1, fatigueMultiplier: 1, boardScaleMultiplier: 1, letality: 0 };
      expect((await as('owner').post('/v1/strategic-games', gameBody({ options: { ...options, openRounds: 'true' } }))).status).toBe(400);
      expect((await as('owner').post('/v1/strategic-games', gameBody({ options: { ...options, openRounds: true } }))).status).toBe(201);
    });

    it('rejects a numeric string in a number field', async () => {
      const response = await as('owner').post('/v1/strategic-games', gameBody({ options: { experienceMultiplier: '1' } }));
      expect(response.status).toBe(400);
    });

    it('validates the nested info and roleplay of a character update, and the management of a new faction', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      expect((await as('owner').patch(`/v1/characters/${character.id}`, { info: { height: '180' } })).status).toBe(400);
      expect((await as('owner').patch(`/v1/characters/${character.id}`, { roleplay: { age: '30' } })).status).toBe(400);
      const updated = await as('owner').patch(`/v1/characters/${character.id}`, {
        info: { height: 1.9 },
        roleplay: { gender: 'male', age: 31 },
      });
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({ info: { height: 1.9 }, roleplay: { age: 31 } });
      const management = { availableGold: '100', availableXP: 0 };
      expect((await as('owner').post('/v1/factions', { gameId, name: 'Rich', management })).status).toBe(400);
      const created = await as('owner').post('/v1/factions', { gameId, name: 'Rich', management: { availableGold: 100, availableXP: 0 } });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ management: { availableGold: 100 } });
    });
  });

  describe('query and route values', () => {
    it('still pages the listings from the query', async () => {
      const games = await as('owner').get('/v1/strategic-games?page=1&size=20');
      expect(games.status).toBe(200);
      expect(games.body).toMatchObject({ pagination: { page: 1, size: 20 } });
      const characters = await as('owner').get('/v1/characters?page=0&size=1000');
      expect(characters.status).toBe(200);
      expect(characters.body).toMatchObject({ pagination: { page: 0, size: 1000 } });
      expect((await as('owner').get('/v1/factions?page=x')).status).toBe(400);
      expect((await as('owner').get('/v1/factions?size=101')).status).toBe(400);
    });

    it('takes true and false as the carried status of an item and rejects anything else', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      const item = await createItem(e2e, { gameId, characterId: character.id });
      const carry = (value: string) => as('owner').put(`/v1/characters/${character.id}/items/${item.id}/carried/${value}`);
      expect((await carry('true')).status).toBe(200);
      expect((await as('owner').get(`/v1/items/${item.id}`)).body).toMatchObject({ carried: true });
      expect((await carry('false')).status).toBe(200);
      expect((await as('owner').get(`/v1/items/${item.id}`)).body).toMatchObject({ carried: false });
      expect((await carry('maybe')).status).toBe(400);
    });

    it('takes true and false as query flags and rejects anything else', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      expect((await as('owner').post(`/v1/characters/${character.id}/level-up?force=maybe`)).status).toBe(400);
      expect((await as('owner').post(`/v1/strategic-games/${gameId}/faction-imports?dryRun=yes`)).status).toBe(400);
    });
  });
});
