import request from 'supertest';
import { ids, startApp, type E2eApp } from './support/app.js';
import { createGame, gameBody } from './support/builders.js';

describe('strategic games (e2e)', () => {
  let e2e: E2eApp;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    e2e.events.clear();
  });

  const get = (path: string, user?: Parameters<E2eApp['auth']>[0]) => {
    const req = request(e2e.server).get(path);
    return user ? req.set('Authorization', e2e.auth(user)) : req;
  };

  describe('authentication', () => {
    it('rejects requests without a token or with a token of another issuer', async () => {
      expect((await request(e2e.server).get('/v1/strategic-games')).status).toBe(401);
      expect((await request(e2e.server).post('/v1/strategic-games').send(gameBody())).status).toBe(401);
      const foreign = e2e.jwks.token({ sub: 'x', groups: ['rmu-admin'], iss: 'http://elsewhere' });
      expect((await request(e2e.server).get('/v1/strategic-games').set('Authorization', `Bearer ${foreign}`)).status).toBe(401);
    });
  });

  describe('create', () => {
    it('creates a private game of the caller and publishes game.created', async () => {
      const response = await request(e2e.server).post('/v1/strategic-games').set('Authorization', e2e.auth('owner')).send(gameBody());
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'E2E game',
        realmId: 'realm-001',
        realmName: 'E2E realm',
        owner: 'e2e-owner',
        status: 'open',
      });
      // The response carries the short description and the access type, private at creation [F-strategic-17]
      expect(response.body).toMatchObject({ shortDescription: 'Short', accessType: 'private' });
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.game.created.v1']);
      expect(e2e.events.published[0].event).toMatchObject({
        eventType: 'created',
        eventVersion: '1',
        producer: 'rmu-api-strategic-e2e',
        data: { name: 'E2E game' },
      });
    });

    it('allows rmu-user and rmu-admin, and rejects a token without groups', async () => {
      expect((await request(e2e.server).post('/v1/strategic-games').set('Authorization', e2e.auth('admin')).send(gameBody())).status).toBe(
        201,
      );
      expect((await request(e2e.server).post('/v1/strategic-games').set('Authorization', e2e.auth('noRole')).send(gameBody())).status).toBe(
        403,
      );
    });

    it('rejects an unknown realm and an invalid body with 400', async () => {
      const unknownRealm = await request(e2e.server)
        .post('/v1/strategic-games')
        .set('Authorization', e2e.auth('owner'))
        .send(gameBody({ realmId: 'realm-missing' }));
      expect(unknownRealm.status).toBe(400);
      expect((unknownRealm.body as { message: string }).message).toBe('Realm not found');
      const invalid = await request(e2e.server)
        .post('/v1/strategic-games')
        .set('Authorization', e2e.auth('owner'))
        .send({ name: 'No options' });
      expect(invalid.status).toBe(400);
    });
  });

  describe('read', () => {
    it('lets the owner and an admin read a private game, not another user', async () => {
      const game = await createGame(e2e);
      expect((await get(`/v1/strategic-games/${game.id}`, 'owner')).status).toBe(200);
      expect((await get(`/v1/strategic-games/${game.id}`, 'admin')).status).toBe(200);
      expect((await get(`/v1/strategic-games/${game.id}`, 'other')).status).toBe(403);
      expect((await get(`/v1/strategic-games/${game.id}`, 'noRole')).status).toBe(403);
    });

    it('answers 404 for an unknown game', async () => {
      expect((await get('/v1/strategic-games/000000000000000000000000', 'admin')).status).toBe(404);
    });

    it('lists only the games the caller can read, sorted by name', async () => {
      const b = await createGame(e2e, 'owner', { name: 'B game' });
      const a = await createGame(e2e, 'owner', { name: 'A game' });
      const others = await createGame(e2e, 'other', { name: 'C game' });
      expect(ids((await get('/v1/strategic-games', 'owner')).body)).toEqual([a.id, b.id]);
      expect(ids((await get('/v1/strategic-games', 'other')).body)).toEqual([others.id]);
      expect(ids((await get('/v1/strategic-games', 'admin')).body)).toEqual([a.id, b.id, others.id]);
      expect(ids((await get('/v1/strategic-games', 'noRole')).body)).toEqual([]);
    });

    it('filters with RSQL and pages the result', async () => {
      for (const name of ['Alpha', 'Beta', 'Gamma']) await createGame(e2e, 'owner', { name });
      const filtered = await get('/v1/strategic-games?q=name==Beta', 'owner');
      expect(filtered.status).toBe(200);
      expect((filtered.body as { content: { name: string }[] }).content.map(g => g.name)).toEqual(['Beta']);

      const page = await get('/v1/strategic-games?page=1&size=2', 'owner');
      expect(page.body).toMatchObject({ pagination: { page: 1, size: 2, totalElements: 3, totalPages: 2 } });
      expect((page.body as { content: { name: string }[] }).content.map(g => g.name)).toEqual(['Gamma']);
      expect((await get('/v1/strategic-games', 'owner')).body).toMatchObject({ pagination: { page: 0, size: 10 } });
    });

    it('rejects an invalid RSQL expression and invalid paging with 400', async () => {
      expect((await get('/v1/strategic-games?q=name=Beta', 'owner')).status).toBe(400);
      expect((await get('/v1/strategic-games?size=0', 'owner')).status).toBe(400);
      expect((await get('/v1/strategic-games?page=-1', 'owner')).status).toBe(400);
    });

    it('accepts pages of up to 100 games', async () => {
      expect((await get('/v1/strategic-games?size=100', 'owner')).status).toBe(200);
      const tooBig = await get('/v1/strategic-games?size=101', 'owner');
      expect(tooBig.status).toBe(400);
      expect(tooBig.body).toMatchObject({ statusCode: 400, code: 'bad-request' });
    });
  });

  describe('update', () => {
    it('lets the owner change the game and publishes game.updated', async () => {
      const game = await createGame(e2e);
      e2e.events.clear();
      const response = await request(e2e.server)
        .patch(`/v1/strategic-games/${game.id}`)
        .set('Authorization', e2e.auth('owner'))
        .send({ name: 'Renamed', description: 'Changed' });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: game.id, name: 'Renamed', description: 'Changed', realmId: 'realm-001' });
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.game.updated.v1']);
    });

    it('versions the game: a PATCH with the version read applies, a stale one is a 409 version-conflict', async () => {
      const game = await createGame(e2e);
      expect(game.version).toBe(0);
      const patch = (body: object) =>
        request(e2e.server).patch(`/v1/strategic-games/${game.id}`).set('Authorization', e2e.auth('owner')).send(body);
      const first = await patch({ name: 'First', version: 0 });
      expect(first.status).toBe(200);
      expect(first.body).toMatchObject({ name: 'First', version: 1 });
      const stale = await patch({ name: 'Stale', version: 0 });
      expect(stale.status).toBe(409);
      expect(stale.body).toMatchObject({ statusCode: 409, error: 'ConflictError', code: 'version-conflict' });
      expect((await patch({ name: 'No version' })).body).toMatchObject({ name: 'No version', version: 2 });
      expect((await patch({ version: -1 })).status).toBe(400);
      // An update writes every prop: the short description must survive it
      const stored = await e2e.connection.collection('strategic-games').findOne({ _id: game.id as never });
      expect(stored).toMatchObject({ shortDescription: 'Short', version: 2 });
    });

    it('neither writes nor publishes a PATCH without changes', async () => {
      const game = await createGame(e2e);
      e2e.events.clear();
      const response = await request(e2e.server)
        .patch(`/v1/strategic-games/${game.id}`)
        .set('Authorization', e2e.auth('owner'))
        .send({ name: game.name as string });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ name: game.name, version: 0 });
      expect(e2e.events.topics()).toEqual([]);
    });

    it('lets an admin change any game', async () => {
      const game = await createGame(e2e);
      const response = await request(e2e.server)
        .patch(`/v1/strategic-games/${game.id}`)
        .set('Authorization', e2e.auth('admin'))
        .send({ name: 'By admin' });
      expect(response.status).toBe(200);
    });

    it('rejects a change by another user or a token without groups [F-strategic-15]', async () => {
      const game = await createGame(e2e);
      for (const user of ['other', 'noRole'] as const) {
        const response = await request(e2e.server)
          .patch(`/v1/strategic-games/${game.id}`)
          .set('Authorization', e2e.auth(user))
          .send({ name: 'Hijacked' });
        expect(response.status).toBe(403);
      }
    });

    it('answers 404 for an unknown game', async () => {
      const response = await request(e2e.server)
        .patch('/v1/strategic-games/000000000000000000000000')
        .set('Authorization', e2e.auth('owner'))
        .send({ name: 'x' });
      expect(response.status).toBe(404);
    });
  });

  describe('delete', () => {
    it('rejects another user and a token without groups', async () => {
      const game = await createGame(e2e);
      for (const user of ['other', 'noRole'] as const) {
        expect((await request(e2e.server).delete(`/v1/strategic-games/${game.id}`).set('Authorization', e2e.auth(user))).status).toBe(403);
      }
    });

    it('lets the owner delete the game and publishes game.deleted', async () => {
      const game = await createGame(e2e);
      e2e.events.clear();
      expect((await request(e2e.server).delete(`/v1/strategic-games/${game.id}`).set('Authorization', e2e.auth('owner'))).status).toBe(204);
      expect((await get(`/v1/strategic-games/${game.id}`, 'owner')).status).toBe(404);
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.game.deleted.v1']);
    });

    it('lets an admin delete any game, and answers 404 afterwards', async () => {
      const game = await createGame(e2e);
      expect((await request(e2e.server).delete(`/v1/strategic-games/${game.id}`).set('Authorization', e2e.auth('admin'))).status).toBe(204);
      expect((await request(e2e.server).delete(`/v1/strategic-games/${game.id}`).set('Authorization', e2e.auth('admin'))).status).toBe(404);
    });
  });
});
