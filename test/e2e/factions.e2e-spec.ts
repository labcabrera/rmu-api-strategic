import request from 'supertest';
import { ids, startApp, type E2eApp, type UserName } from './support/app.js';
import { createFaction, createGame } from './support/builders.js';

describe('factions (e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    gameId = (await createGame(e2e)).id;
    e2e.events.clear();
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', e2e.auth(user)),
  });

  it('rejects requests without a token', async () => {
    expect((await request(e2e.server).get('/v1/factions')).status).toBe(401);
    expect((await request(e2e.server).post('/v1/factions').send({ gameId, name: 'x' })).status).toBe(401);
  });

  describe('create', () => {
    it('creates a faction of the caller with empty management and publishes faction.created', async () => {
      const response = await as('owner').post('/v1/factions', { gameId, name: 'Rangers', shortDescription: 'Short' });
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        gameId,
        name: 'Rangers',
        shortDescription: 'Short',
        owner: 'e2e-owner',
        management: { availableGold: 0, availableXP: 0 },
      });
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.faction.created.v1']);
    });

    it('rejects an unknown game and an invalid body with 400', async () => {
      const unknown = await as('owner').post('/v1/factions', { gameId: 'game-missing', name: 'x' });
      expect(unknown.status).toBe(400);
      expect((unknown.body as { message: string }).message).toBe('Game not found');
      expect((await as('owner').post('/v1/factions', { gameId })).status).toBe(400);
    });

    it.skip('rejects a token without groups and a user who cannot read the game [F-strategic-16]', async () => {
      expect((await as('noRole').post('/v1/factions', { gameId, name: 'x' })).status).toBe(403);
      expect((await as('other').post('/v1/factions', { gameId, name: 'x' })).status).toBe(403);
    });
  });

  describe('read', () => {
    it('reads a faction by id and answers 404 for an unknown one', async () => {
      const faction = await createFaction(e2e, gameId);
      expect((await as('owner').get(`/v1/factions/${faction.id}`)).body).toMatchObject({ id: faction.id, name: 'E2E faction' });
      expect((await as('admin').get(`/v1/factions/${faction.id}`)).status).toBe(200);
      expect((await as('owner').get('/v1/factions/faction-missing')).status).toBe(404);
    });

    it('filters with RSQL, sorts and pages', async () => {
      for (const name of ['Alpha', 'Beta', 'Gamma']) await createFaction(e2e, gameId, 'owner', { name });
      const filtered = await as('owner').get(`/v1/factions?q=gameId==${gameId};name==Beta`);
      expect((filtered.body as { content: { name: string }[] }).content.map(f => f.name)).toEqual(['Beta']);
      const page = await as('owner').get('/v1/factions?page=0&size=2');
      expect(page.body).toMatchObject({ pagination: { page: 0, size: 2, totalElements: 3, totalPages: 2 } });
      expect((page.body as { content: unknown[] }).content).toHaveLength(2);
      expect((await as('owner').get('/v1/factions?q=name=x')).status).toBe(400);
    });

    it.skip('hides the factions of another user from reads and listings [F-strategic-16]', async () => {
      const faction = await createFaction(e2e, gameId);
      expect((await as('other').get(`/v1/factions/${faction.id}`)).status).toBe(403);
      expect((await as('noRole').get(`/v1/factions/${faction.id}`)).status).toBe(403);
      expect(ids((await as('other').get('/v1/factions')).body)).toEqual([]);
    });
  });

  describe('update', () => {
    it('lets the owner and an admin change the faction, and publishes faction.updated', async () => {
      const faction = await createFaction(e2e, gameId);
      e2e.events.clear();
      const response = await as('owner').patch(`/v1/factions/${faction.id}`, { name: 'Renamed', description: 'Changed' });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: faction.id, name: 'Renamed', description: 'Changed' });
      expect((await as('admin').patch(`/v1/factions/${faction.id}`, { name: 'By admin' })).status).toBe(200);
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.faction.updated.v1', 'internal.rmu-strategic.faction.updated.v1']);
    });

    it('rejects a PATCH with a stale version with 409 version-conflict', async () => {
      const faction = await createFaction(e2e, gameId);
      expect(faction.version).toBe(0);
      expect((await as('owner').patch(`/v1/factions/${faction.id}`, { name: 'First', version: 0 })).body).toMatchObject({ version: 1 });
      const stale = await as('owner').patch(`/v1/factions/${faction.id}`, { name: 'Stale', version: 0 });
      expect(stale.status).toBe(409);
      expect(stale.body).toMatchObject({ code: 'version-conflict' });
      // Spending gold is a write of its own: it moves the version too
      expect((await as('owner').post(`/v1/factions/${faction.id}/add-gold`, { gold: 0 })).body).toMatchObject({ version: 2 });
    });

    it('answers 404 for an unknown faction', async () => {
      expect((await as('owner').patch('/v1/factions/faction-missing', { name: 'x' })).status).toBe(404);
    });

    it.skip('rejects a change by another user or a token without groups [F-strategic-16]', async () => {
      const faction = await createFaction(e2e, gameId);
      expect((await as('other').patch(`/v1/factions/${faction.id}`, { name: 'Hijacked' })).status).toBe(403);
      expect((await as('noRole').patch(`/v1/factions/${faction.id}`, { name: 'Hijacked' })).status).toBe(403);
    });
  });

  describe('xp and gold', () => {
    it('lets anyone spend gold, but not below zero', async () => {
      const faction = await createFaction(e2e, gameId, 'owner', { management: { availableGold: 10, availableXP: 0 } });
      const spent = await as('owner').post(`/v1/factions/${faction.id}/add-gold`, { gold: -4 });
      expect(spent.status).toBe(200);
      expect(spent.body).toMatchObject({ management: { availableGold: 6 } });
      expect((await as('owner').post(`/v1/factions/${faction.id}/add-gold`, { gold: -7 })).status).toBe(400);
    });

    it('requires the faction-management role to add gold or xp, a role no Keycloak group gives [F-strategic-18]', async () => {
      const faction = await createFaction(e2e, gameId);
      expect((await as('admin').post(`/v1/factions/${faction.id}/add-gold`, { gold: 5 })).status).toBe(403);
      expect((await as('admin').post(`/v1/factions/${faction.id}/add-xp`, { xp: 5 })).status).toBe(403);
      const manager = e2e.jwks.token({ sub: 'e2e-manager', groups: ['faction-management'] });
      const xp = await request(e2e.server)
        .post(`/v1/factions/${faction.id}/add-xp`)
        .set('Authorization', `Bearer ${manager}`)
        .send({ xp: 5 });
      expect(xp.status).toBe(200);
      expect(xp.body).toMatchObject({ management: { availableXP: 5 } });
    });

    it.skip('lets the owner of the game add gold and xp to its factions [F-strategic-18]', async () => {
      const faction = await createFaction(e2e, gameId);
      expect((await as('owner').post(`/v1/factions/${faction.id}/add-gold`, { gold: 5 })).status).toBe(200);
      expect((await as('owner').post(`/v1/factions/${faction.id}/add-xp`, { xp: 5 })).status).toBe(200);
    });
  });

  describe('delete', () => {
    it('deletes the faction and publishes faction.deleted', async () => {
      const faction = await createFaction(e2e, gameId);
      e2e.events.clear();
      expect((await as('owner').delete(`/v1/factions/${faction.id}`)).status).toBe(204);
      expect((await as('owner').get(`/v1/factions/${faction.id}`)).status).toBe(404);
      expect((await as('owner').delete(`/v1/factions/${faction.id}`)).status).toBe(404);
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.faction.deleted.v1']);
    });

    it.skip('rejects a delete by another user or a token without groups [F-strategic-16]', async () => {
      const faction = await createFaction(e2e, gameId);
      expect((await as('other').delete(`/v1/factions/${faction.id}`)).status).toBe(403);
      expect((await as('noRole').delete(`/v1/factions/${faction.id}`)).status).toBe(403);
    });
  });
});
