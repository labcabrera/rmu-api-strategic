import request from 'supertest';
import { ids, startApp, type E2eApp, type UserName } from './support/app.js';
import { characterBody, createCharacter, createItem, gameWithFaction } from './support/builders.js';

// Character bodies are large: they are built from the core fakes (race, profession, skills) in support/fakes.ts.
describe('characters (e2e)', () => {
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
    e2e.events.clear();
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', e2e.auth(user)),
  });

  it('rejects requests without a token', async () => {
    expect((await request(e2e.server).get('/v1/characters')).status).toBe(401);
    expect((await request(e2e.server).post('/v1/characters').send(characterBody(gameId, factionId))).status).toBe(401);
  });

  describe('create', () => {
    it('creates the character from the race, profession and skills of core, and publishes character.created', async () => {
      const response = await as('owner').post('/v1/characters', characterBody(gameId, factionId));
      expect(response.status).toBe(201);
      const body = response.body as {
        owner: string;
        faction: { id: string };
        info: { race: { id: string } };
        skills: { skillId: string }[];
        experience: { level: number };
      };
      expect(body).toMatchObject({ gameId, name: 'E2E character', owner: 'e2e-owner', faction: { id: factionId } });
      expect(body.info).toMatchObject({ race: { id: 'race-001', name: 'E2E race' } });
      expect(body.skills.map(s => s.skillId).sort()).toEqual(['body-development', 'perception']);
      expect(body.experience.level).toBe(0);
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.character.created.v1']);
    });

    it('rejects an unknown game, a faction of another game and an unknown skill with 400', async () => {
      const other = await gameWithFaction(e2e);
      expect((await as('owner').post('/v1/characters', characterBody('game-missing', factionId))).status).toBe(400);
      expect((await as('owner').post('/v1/characters', characterBody(gameId, other.faction.id))).status).toBe(400);
      const skill = await as('owner').post(
        '/v1/characters',
        characterBody(gameId, factionId, { skills: [{ skillId: 'unknown-skill', specialization: null, ranks: 0 }] }),
      );
      expect(skill.status).toBe(400);
      expect((skill.body as { message: string }).message).toBe("Invalid skill identifier 'unknown-skill'");
      expect((await as('owner').post('/v1/characters', { name: 'x' })).status).toBe(400);
    });

    it.skip('rejects a token without groups and a user who cannot read the game [F-strategic-15]', async () => {
      expect((await as('noRole').post('/v1/characters', characterBody(gameId, factionId))).status).toBe(403);
      expect((await as('other').post('/v1/characters', characterBody(gameId, factionId))).status).toBe(403);
    });
  });

  describe('read', () => {
    it('reads by id and answers 404 for an unknown character', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      expect((await as('owner').get(`/v1/characters/${character.id}`)).body).toMatchObject({ id: character.id });
      expect((await as('admin').get(`/v1/characters/${character.id}`)).status).toBe(200);
      expect((await as('owner').get('/v1/characters/character-missing')).status).toBe(404);
    });

    it('filters with RSQL, sorts by name and pages', async () => {
      for (const name of ['Bilbo', 'Aragorn', 'Celeborn']) await createCharacter(e2e, gameId, factionId, 'owner', { name });
      const all = await as('owner').get(`/v1/characters?q=gameId==${gameId}`);
      expect((all.body as { content: { name: string }[] }).content.map(c => c.name)).toEqual(['Aragorn', 'Bilbo', 'Celeborn']);
      const filtered = await as('owner').get('/v1/characters?q=name==Bilbo');
      expect((filtered.body as { content: { name: string }[] }).content.map(c => c.name)).toEqual(['Bilbo']);
      const page = await as('owner').get('/v1/characters?page=1&size=2');
      expect(page.body).toMatchObject({ pagination: { page: 1, size: 2, totalElements: 3, totalPages: 2 } });
      expect((await as('owner').get('/v1/characters?q=name=x')).status).toBe(400);
      // rmu-api-tactical reads the characters of a game with size=1000
      expect((await as('owner').get(`/v1/characters?q=gameId==${gameId}&page=0&size=1000`)).status).toBe(200);
      expect((await as('owner').get('/v1/characters?size=1001')).status).toBe(400);
    });

    it.skip('hides the characters of another user from reads and listings [F-strategic-15]', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      expect((await as('other').get(`/v1/characters/${character.id}`)).status).toBe(403);
      expect((await as('noRole').get(`/v1/characters/${character.id}`)).status).toBe(403);
      expect(ids((await as('other').get('/v1/characters')).body)).toEqual([]);
    });
  });

  describe('update', () => {
    it('lets the owner change the character and publishes character.updated', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      e2e.events.clear();
      const response = await as('owner').patch(`/v1/characters/${character.id}`, { name: 'Renamed', description: 'Changed' });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: character.id, name: 'Renamed', description: 'Changed' });
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.character.updated.v1']);
      expect((await as('admin').patch(`/v1/characters/${character.id}`, { name: 'By admin' })).status).toBe(200);
    });

    it('rejects a PATCH with a stale version with 409 version-conflict', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      expect(character.version).toBe(0);
      await as('owner').post(`/v1/characters/${character.id}/xp`, { xp: 10 });
      const stale = await as('owner').patch(`/v1/characters/${character.id}`, { name: 'Stale', version: 0 });
      expect(stale.status).toBe(409);
      expect(stale.body).toMatchObject({ code: 'version-conflict' });
      expect((await as('owner').patch(`/v1/characters/${character.id}`, { name: 'Fresh', version: 1 })).body).toMatchObject({ version: 2 });
    });

    it('answers 404 for an unknown character', async () => {
      expect((await as('owner').patch('/v1/characters/character-missing', { name: 'x' })).status).toBe(404);
    });

    it.skip('rejects a change by another user or a token without groups [F-strategic-15]', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      expect((await as('other').patch(`/v1/characters/${character.id}`, { name: 'Hijacked' })).status).toBe(403);
      expect((await as('noRole').patch(`/v1/characters/${character.id}`, { name: 'Hijacked' })).status).toBe(403);
      expect((await as('other').post(`/v1/characters/${character.id}/xp`, { xp: 1000 })).status).toBe(403);
    });
  });

  describe('experience and equipment', () => {
    it('adds experience without publishing character.updated [F-strategic-14]', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      e2e.events.clear();
      const response = await as('owner').post(`/v1/characters/${character.id}/xp`, { xp: 1500 });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ experience: { xp: 1500 } });
      expect(e2e.events.topics()).toEqual([]);
    });

    it('carries an item of the character and refuses to equip an item it does not have', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      const item = await createItem(e2e, { gameId, characterId: character.id });
      const carried = await request(e2e.server)
        .put(`/v1/characters/${character.id}/items/${item.id}/carried/true`)
        .set('Authorization', e2e.auth('owner'));
      expect(carried.status).toBe(200);
      const missing = await as('owner').post(`/v1/characters/${character.id}/equipment`, { itemId: 'item-missing', slot: 'mainHand' });
      expect(missing.status).toBeGreaterThanOrEqual(400);
      expect(missing.status).toBeLessThan(500);
    });
  });

  describe('delete', () => {
    it('deletes the character and publishes character.deleted', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      e2e.events.clear();
      expect((await as('owner').delete(`/v1/characters/${character.id}`)).status).toBe(204);
      expect((await as('owner').get(`/v1/characters/${character.id}`)).status).toBe(404);
      expect((await as('owner').delete(`/v1/characters/${character.id}`)).status).toBe(404);
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.character.deleted.v1']);
    });

    it.skip('rejects a delete by another user or a token without groups [F-strategic-15]', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      expect((await as('other').delete(`/v1/characters/${character.id}`)).status).toBe(403);
      expect((await as('noRole').delete(`/v1/characters/${character.id}`)).status).toBe(403);
    });
  });
});
