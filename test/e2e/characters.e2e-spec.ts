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

    it('rejects a token without groups, and lets a player create their character in the game of another user [F-strategic-15]', async () => {
      expect((await as('noRole').post('/v1/characters', characterBody(gameId, factionId))).status).toBe(403);
      // Games are created private: a player joins the game of the game master with a character of their own
      const created = await as('other').post('/v1/characters', characterBody(gameId, factionId));
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ owner: 'e2e-other', gameId });
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

    it('hides the characters of a private game of another user from reads and listings [F-strategic-15]', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      expect((await as('other').get(`/v1/characters/${character.id}`)).status).toBe(403);
      expect((await as('noRole').get(`/v1/characters/${character.id}`)).status).toBe(403);
      expect((await as('other').get(`/v1/characters/${character.id}/healing-log`)).status).toBe(403);
      expect(ids((await as('other').get('/v1/characters')).body)).toEqual([]);
      expect(ids((await as('noRole').get(`/v1/characters?q=gameId==${gameId}`)).body)).toEqual([]);
      expect(ids((await as('admin').get('/v1/characters')).body)).toEqual([character.id]);
      expect((await as('service').get(`/v1/characters/${character.id}`)).status).toBe(200);
    });

    it('lets a player of a private game read it, its factions and the characters of the other players [decision 2]', async () => {
      const mine = await createCharacter(e2e, gameId, factionId);
      const theirs = await createCharacter(e2e, gameId, factionId, 'other');
      // `other` owns a character in the private game of `owner`: they are a player of it
      expect((await as('other').get(`/v1/characters/${theirs.id}`)).status).toBe(200);
      expect((await as('other').get(`/v1/characters/${mine.id}`)).status).toBe(200);
      expect((await as('other').get(`/v1/strategic-games/${gameId}`)).body).toMatchObject({
        id: gameId,
        accessType: 'private',
        owner: 'e2e-owner',
      });
      expect(ids((await as('other').get('/v1/strategic-games')).body)).toEqual([gameId]);
      expect((await as('other').get(`/v1/factions/${factionId}`)).status).toBe(200);
      expect(ids((await as('other').get(`/v1/factions?q=gameId==${gameId}`)).body)).toEqual([factionId]);
      // What rmu-api-tactical asks for with the token of the player
      const tactical = await as('other').get(`/v1/characters?q=gameId==${gameId}&page=0&size=1000`);
      expect(ids(tactical.body).sort()).toEqual([mine.id, theirs.id].sort());
      expect((await as('owner').get(`/v1/characters/${theirs.id}`)).status).toBe(200);
      // Reading is not changing: the player changes neither the game nor the character of another player
      expect((await as('other').patch(`/v1/strategic-games/${gameId}`, { name: 'Hijacked' })).status).toBe(403);
      expect((await as('other').patch(`/v1/characters/${mine.id}`, { name: 'Hijacked' })).status).toBe(403);
      expect((await as('other').patch(`/v1/factions/${factionId}`, { name: 'Hijacked' })).status).toBe(403);
    });

    it('rejects a user without a character in the private game', async () => {
      const mine = await createCharacter(e2e, gameId, factionId);
      const outsider = `Bearer ${e2e.jwks.token({ sub: 'e2e-outsider', groups: ['rmu-user'] })}`;
      const get = (path: string) => request(e2e.server).get(path).set('Authorization', outsider);
      expect((await get(`/v1/strategic-games/${gameId}`)).status).toBe(403);
      expect((await get(`/v1/characters/${mine.id}`)).status).toBe(403);
      expect((await get(`/v1/factions/${factionId}`)).status).toBe(403);
      expect(ids((await get(`/v1/characters?q=gameId==${gameId}`)).body)).toEqual([]);
      expect(ids((await get('/v1/strategic-games')).body)).toEqual([]);
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

    it('rejects a change by another user or a token without groups [F-strategic-15]', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      expect((await as('other').patch(`/v1/characters/${character.id}`, { name: 'Hijacked' })).status).toBe(403);
      expect((await as('noRole').patch(`/v1/characters/${character.id}`, { name: 'Hijacked' })).status).toBe(403);
      expect((await as('other').post(`/v1/characters/${character.id}/xp`, { xp: 1000 })).status).toBe(403);
    });
  });

  describe('experience and equipment', () => {
    it('publishes character.updated with the final state on each mutation [F-strategic-14]', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      const item = await createItem(e2e, { gameId, characterId: character.id });
      e2e.events.clear();
      const response = await as('owner').post(`/v1/characters/${character.id}/xp`, { xp: 1500 });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ experience: { xp: 1500 } });
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.character.updated.v1']);
      expect(e2e.events.published[0].event).toMatchObject({ data: { id: character.id, experience: { xp: 1500 } } });
      e2e.events.clear();
      const carry = (carried: boolean) =>
        request(e2e.server)
          .put(`/v1/characters/${character.id}/items/${item.id}/carried/${carried}`)
          .set('Authorization', e2e.auth('owner'));
      expect((await carry(true)).status).toBe(200);
      expect((await as('owner').post(`/v1/characters/${character.id}/equipment`, { itemId: item.id, slot: 'mainHand' })).status).toBe(201);
      expect((await as('owner').delete(`/v1/characters/${character.id}/equipment/${item.id}`)).status).toBe(200);
      expect(e2e.events.topics().every(topic => topic === 'internal.rmu-strategic.character.updated.v1')).toBe(true);
      expect(e2e.events.topics().length).toBeGreaterThanOrEqual(2);
    });

    it('neither writes nor publishes a mutation that changes nothing', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      e2e.events.clear();
      const response = await as('owner').post(`/v1/characters/${character.id}/xp`, { xp: 0 });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ version: 0 });
      expect(e2e.events.topics()).toEqual([]);
    });

    it('publishes the gold moved between the faction and the character [F-strategic-14]', async () => {
      const rich = (await as('owner').post('/v1/factions', { gameId, name: 'Rich', management: { availableGold: 10, availableXP: 0 } }))
        .body as { id: string };
      const character = await createCharacter(e2e, gameId, rich.id);
      e2e.events.clear();
      const response = await as('owner').patch(`/v1/characters/${character.id}/transfer-faction-gold`, { amount: 4 });
      expect(response.status).toBe(200);
      expect(e2e.events.topics()).toEqual(
        // Spec 023: the first coins of the character are a new stack
        expect.arrayContaining(['internal.rmu-strategic.item.created.v1', 'internal.rmu-strategic.faction.updated.v1']),
      );
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

  describe('add skill [F-strategic-25]', () => {
    type Skill = { skillId: string; ranks: number };
    const skillOf = (body: unknown, skillId: string) => (body as { skills: Skill[] }).skills.find(s => s.skillId === skillId);

    it('lets an rmu-admin add a skill with initial ranks, which the sheet counts', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      const response = await as('admin').post(`/v1/characters/${character.id}/skills`, {
        skillId: 'jumping',
        specialization: null,
        ranks: 3,
      });
      expect(response.status).toBe(201);
      const jumping = skillOf(response.body, 'jumping')!;
      // Initial ranks, not ranks developed this level
      expect(jumping).toMatchObject({ ranks: 3, ranksDeveloped: 0 });
      // The processor counts them: 3 ranks are worth 15 points
      expect(jumping).toMatchObject({ developmentBonus: 15, totalBonus: 15 });
    });

    it('rejects initial ranks from an rmu-user, and negative ranks from anyone', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      const user = await as('owner').post(`/v1/characters/${character.id}/skills`, { skillId: 'jumping', specialization: null, ranks: 1 });
      expect(user.status).toBe(400);
      const negative = await as('admin').post(`/v1/characters/${character.id}/skills`, {
        skillId: 'jumping',
        specialization: null,
        ranks: -1,
      });
      expect(negative.status).toBe(400);
      const zero = await as('owner').post(`/v1/characters/${character.id}/skills`, { skillId: 'jumping', specialization: null, ranks: 0 });
      expect(zero.status).toBe(201);
      expect(skillOf(zero.body, 'jumping')).toMatchObject({ ranks: 0 });
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

    it('rejects a delete by another user or a token without groups [F-strategic-15]', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      expect((await as('other').delete(`/v1/characters/${character.id}`)).status).toBe(403);
      expect((await as('noRole').delete(`/v1/characters/${character.id}`)).status).toBe(403);
    });
  });

  // rmu-api-tactical applies the outcome of a tactical game with the token of the user who runs it, the owner of the
  // strategic game: that owner changes the characters of the other players (spec 021, decision 2).
  describe('the owner of the game and the players', () => {
    const third = () => `Bearer ${e2e.jwks.token({ sub: 'e2e-third', groups: ['rmu-user'] })}`;
    let characterId: string;
    let itemId: string;
    const outcome = (overrides: Record<string, unknown> = {}) => ({
      tacticalGameId: 'tactical-001',
      tacticalGameName: 'E2E skirmish',
      actorId: 'actor-001',
      characterId,
      name: 'E2E character',
      hp: { start: 0, end: 0, delta: 0 },
      injuries: [],
      ...overrides,
    });

    beforeEach(async () => {
      characterId = (await createCharacter(e2e, gameId, factionId, 'other')).id;
      itemId = (await createItem(e2e, { gameId, characterId }, 'other')).id;
      e2e.events.clear();
    });

    it('lets the owner of the game change, carry, equip, give xp to and delete the character of a player', async () => {
      expect((await as('owner').patch(`/v1/characters/${characterId}`, { name: 'By the game master' })).status).toBe(200);
      expect((await as('owner').post(`/v1/characters/${characterId}/xp`, { xp: 100 })).status).toBe(200);
      const carried = await request(e2e.server)
        .put(`/v1/characters/${characterId}/items/${itemId}/carried/true`)
        .set('Authorization', e2e.auth('owner'));
      expect(carried.status).toBe(200);
      const injury = await as('owner').post(`/v1/characters/${characterId}/injuries`, { type: 'bone', penalty: -10 });
      expect(injury.status).toBe(200);
      expect((await as('owner').delete(`/v1/characters/${characterId}`)).status).toBe(204);
    });

    it('lets the owner of the game change the items of a player: modifiers, rename and delete', async () => {
      const modifier = { type: 'breakage', value: -10, appliesTo: 'all' };
      expect((await as('owner').post(`/v1/items/${itemId}/modifiers`, modifier)).status).toBe(201);
      expect((await as('owner').patch(`/v1/items/${itemId}`, { name: 'Dented stone' })).status).toBe(200);
      expect((await as('owner').get(`/v1/items/${itemId}`)).status).toBe(200);
      expect((await as('owner').delete(`/v1/items/${itemId}`)).status).toBe(204);
    });

    it('lets the owner of the game apply a tactical outcome to the character of a player, with the item modifiers', async () => {
      const response = await as('owner').post(
        `/v1/characters/${characterId}/tactical-outcomes`,
        outcome({
          items: [
            {
              itemId,
              modifiers: [
                {
                  id: 'mod-001',
                  type: 'breakage',
                  value: -10,
                  appliesTo: 'all',
                  source: { kind: 'tactical' },
                  createdAt: '2026-10-24T10:00:00.000Z',
                },
              ],
            },
          ],
        }),
      );
      expect(response.status).toBe(200);
      const item = await as('owner').get(`/v1/items/${itemId}`);
      expect((item.body as { modifiers: { id: string }[] }).modifiers.map(m => m.id)).toEqual(['mod-001']);
    });

    it('lets the player change their own character and items, and not another player', async () => {
      expect((await as('other').patch(`/v1/characters/${characterId}`, { name: 'Mine' })).status).toBe(200);
      expect((await as('other').post(`/v1/items/${itemId}/modifiers`, { type: 'breakage', value: -5, appliesTo: 'all' })).status).toBe(201);
      for (const [method, path, body] of [
        ['patch', `/v1/characters/${characterId}`, { name: 'Hijacked' }],
        ['post', `/v1/characters/${characterId}/xp`, { xp: 1 }],
        ['post', `/v1/characters/${characterId}/tactical-outcomes`, outcome()],
        ['patch', `/v1/items/${itemId}`, { name: 'Hijacked' }],
        ['post', `/v1/items/${itemId}/modifiers`, { type: 'breakage', value: -5, appliesTo: 'all' }],
      ] as const) {
        const response = await request(e2e.server)[method](path).set('Authorization', third()).send(body);
        expect([path, response.status]).toEqual([path, 403]);
      }
      expect((await request(e2e.server).get(`/v1/characters/${characterId}`).set('Authorization', third())).status).toBe(403);
      expect((await request(e2e.server).delete(`/v1/characters/${characterId}`).set('Authorization', third())).status).toBe(403);
      expect((await request(e2e.server).delete(`/v1/items/${itemId}`).set('Authorization', third())).status).toBe(403);
    });
  });
});
