import type { KafkaContext } from '@nestjs/microservices';
import request from 'supertest';
import { KafkaChronicleGameEventConsumer } from '../../src/modules/chronicle/interfaces/messaging/kafka.game-event-consumer.js';
import { addMember, startApp, type E2eApp, type UserName } from './support/app.js';
import { createFaction, createGame } from './support/builders.js';
import { mediaCalls } from './support/fakes.js';

type Body = Record<string, unknown>;
type Chapter = { id: string; title: string; visibility: string; order: number; version: number } & Body;

const GAME_DELETED = 'internal.rmu-strategic.game.deleted.v1';
const context = { getTopic: () => GAME_DELETED } as unknown as KafkaContext;

/** Workspace spec 102: the chronicle of a strategic game, its access by role, its limits, its order and its cascade. */
describe('chronicle (e2e)', () => {
  let e2e: E2eApp;
  // Users beyond those of the suite: a co-master, a spectator and somebody with no relation to the game.
  const extra = {
    mira: { sub: 'e2e-mira', groups: ['rmu-user'] },
    sam: { sub: 'e2e-sam', groups: ['rmu-user'] },
    olaf: { sub: 'e2e-olaf', groups: ['rmu-user'] },
  };
  type Who = UserName | keyof typeof extra;
  const token = (user: Who) => (user in extra ? `Bearer ${e2e.jwks.token(extra[user as keyof typeof extra])}` : e2e.auth(user as UserName));
  const as = (user: Who) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', token(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', token(user)).send(body),
    put: (path: string, body: object) => request(e2e.server).put(path).set('Authorization', token(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', token(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', token(user)),
  });
  const list = (user: Who, gameId: string, extraQuery = '') =>
    as(user).get(`/v1/chronicle-chapters?q=${encodeURIComponent(`gameId==${gameId}${extraQuery}`)}&size=1000`);
  const titles = (body: unknown) => (body as { content: Chapter[] }).content.map(chapter => chapter.title);

  /** A game of `owner` with mira as co-master, other as player and sam as spectator. */
  async function chronicleGame(overrides: Record<string, unknown> = {}) {
    const game = await createGame(e2e, 'owner', overrides);
    await setRole(game.id, 'e2e-mira', 'master');
    await addMember(e2e, game.id, 'other', 'player');
    await setRole(game.id, 'e2e-sam', 'spectator');
    return game;
  }

  async function setRole(gameId: string, userId: string, role: string) {
    await request(e2e.server)
      .put(`/v1/strategic-games/${gameId}/members/${userId}`)
      .set('Authorization', e2e.auth('admin'))
      .send({ role })
      .expect(200);
  }

  async function chapter(gameId: string, body: Record<string, unknown> = {}, user: Who = 'owner'): Promise<Chapter> {
    const response = await as(user).post('/v1/chronicle-chapters', { gameId, title: 'Chapter', ...body });
    if (response.status !== 201) throw new Error(`POST chapter answered ${response.status}: ${JSON.stringify(response.body)}`);
    return response.body as Chapter;
  }

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
  });

  describe('reading', () => {
    it('shows the private chapters only to the owner, the masters and the admins', async () => {
      const game = await chronicleGame();
      const lore = await chapter(game.id, { title: 'Lore', content: '## The ford\n\nText', campaignDate: 3 });
      const notes = await chapter(game.id, { title: 'Master notes', visibility: 'master' }, 'mira');

      expect(lore).toMatchObject({ gameId: game.id, visibility: 'public', order: 0, campaignDate: 3, owner: 'e2e-owner', version: 0 });
      expect(lore).toMatchObject({ updatedBy: 'e2e-owner', content: '## The ford\n\nText' });
      expect(notes).toMatchObject({ visibility: 'master', order: 1, campaignDate: null, content: '', owner: 'e2e-mira' });

      for (const user of ['owner', 'mira', 'admin'] as const) {
        const response = await list(user, game.id);
        expect(response.status).toBe(200);
        expect(titles(response.body)).toEqual(['Lore', 'Master notes']);
      }
      for (const user of ['other', 'sam'] as const) {
        const response = await list(user, game.id);
        expect(response.status).toBe(200);
        expect(titles(response.body)).toEqual(['Lore']);
        expect(response.body).toMatchObject({ pagination: { totalElements: 1 } });
        expect((await as(user).get(`/v1/chronicle-chapters/${notes.id}`)).body).toMatchObject({
          statusCode: 404,
          code: 'chapter-not-found',
        });
        const read = await as(user).get(`/v1/chronicle-chapters/${lore.id}`);
        expect(read.status).toBe(200);
        expect(read.body).toMatchObject({ title: 'Lore', content: '## The ford\n\nText' });
      }
      // The listing has no content
      const listed = (await list('owner', game.id)).body as { content: Chapter[] };
      expect(listed.content[0]).not.toHaveProperty('content');
      expect(listed.content[0]).toMatchObject({ id: lore.id, version: 0, campaignDate: 3, updatedBy: 'e2e-owner' });
    });

    it('shows no chronicle to an outsider, nor to whoever only sees the card of a public game', async () => {
      const game = await chronicleGame({ accessType: 'public' });
      const lore = await chapter(game.id, { title: 'Lore' });
      const notes = await chapter(game.id, { title: 'Notes', visibility: 'master' });

      expect((await list('olaf', game.id)).body).toMatchObject({ statusCode: 403, code: 'forbidden' });
      expect((await as('olaf').get(`/v1/chronicle-chapters/${lore.id}`)).status).toBe(403);
      // A private chapter is a 404 for anyone below master, also an outsider
      expect((await as('olaf').get(`/v1/chronicle-chapters/${notes.id}`)).body).toMatchObject({ code: 'chapter-not-found' });
    });

    it('needs the game in the query, and answers 404 for a missing game or chapter', async () => {
      const game = await chronicleGame();
      expect((await as('owner').get('/v1/chronicle-chapters')).body).toMatchObject({ statusCode: 400, code: 'validation' });
      expect((await as('owner').get('/v1/chronicle-chapters?q=gameId!=x')).status).toBe(400);
      expect((await as('owner').get('/v1/chronicle-chapters?q=gameId==')).status).toBe(400);
      expect((await as('owner').get(`/v1/chronicle-chapters?q=${encodeURIComponent('gameId==a,gameId==b')}`)).status).toBe(400);
      expect((await list('owner', 'missing-game')).status).toBe(404);
      expect((await as('owner').get('/v1/chronicle-chapters/missing')).body).toMatchObject({ code: 'chapter-not-found' });

      // Other conditions go with ';'
      await chapter(game.id, { title: 'Public' });
      await chapter(game.id, { title: 'Private', visibility: 'master' });
      expect(titles((await list('owner', game.id, ';visibility==master')).body)).toEqual(['Private']);
      // A player asking for the private ones still gets none
      expect(titles((await list('other', game.id, ';visibility==master')).body)).toEqual([]);
    });

    it('leaves the chronicle out of the export of a faction of the game', async () => {
      const game = await chronicleGame();
      const faction = await createFaction(e2e, game.id);
      await chapter(game.id, { title: 'Secret chronicle title', content: 'Secret chronicle content' });

      const exported = await as('owner').get(`/v1/factions/${faction.id}/export`);

      expect(exported.status).toBe(200);
      const text = JSON.stringify(exported.body);
      expect(text).not.toContain('Secret chronicle');
      expect(text.toLowerCase()).not.toContain('chronicle');
      expect(text).not.toContain('chapter');
    });
  });

  describe('writing', () => {
    it('lets only the masters create, change and delete chapters', async () => {
      const game = await chronicleGame();
      const lore = await chapter(game.id, { title: 'Lore' });
      const notes = await chapter(game.id, { title: 'Notes', visibility: 'master' });

      for (const user of ['other', 'sam', 'olaf'] as const) {
        expect((await as(user).post('/v1/chronicle-chapters', { gameId: game.id, title: 'Diary' })).body).toMatchObject({
          statusCode: 403,
        });
        expect((await as(user).patch(`/v1/chronicle-chapters/${lore.id}`, { title: 'Mine' })).status).toBe(403);
        expect((await as(user).delete(`/v1/chronicle-chapters/${lore.id}`)).status).toBe(403);
        // The private one is not revealed
        expect((await as(user).patch(`/v1/chronicle-chapters/${notes.id}`, { title: 'Mine' })).body).toMatchObject({
          code: 'chapter-not-found',
        });
        expect((await as(user).delete(`/v1/chronicle-chapters/${notes.id}`)).status).toBe(404);
      }

      const changed = await as('mira').patch(`/v1/chronicle-chapters/${lore.id}`, {
        title: '  The ford  ',
        content: 'New text',
        visibility: 'master',
        campaignDate: 7,
      });
      expect(changed.status).toBe(200);
      expect(changed.body).toMatchObject({
        title: 'The ford',
        content: 'New text',
        visibility: 'master',
        campaignDate: 7,
        version: 1,
        owner: 'e2e-owner',
        updatedBy: 'e2e-mira',
      });
      // null clears the campaign date
      expect((await as('owner').patch(`/v1/chronicle-chapters/${lore.id}`, { campaignDate: null })).body).toMatchObject({
        campaignDate: null,
        version: 2,
      });

      expect((await as('admin').delete(`/v1/chronicle-chapters/${notes.id}`)).status).toBe(204);
      expect((await as('owner').get(`/v1/chronicle-chapters/${notes.id}`)).status).toBe(404);
      expect((await as('owner').delete(`/v1/chronicle-chapters/${notes.id}`)).status).toBe(404);
      // A new chapter goes after the last one left
      expect((await chapter(game.id, { title: 'Last' })).order).toBe(1);
      expect((await as('owner').post('/v1/chronicle-chapters', { gameId: 'missing', title: 'X' })).status).toBe(404);
    });

    it('rejects a stale version with version-conflict, and a PATCH without changes does not write', async () => {
      const game = await chronicleGame();
      const lore = await chapter(game.id, { title: 'Lore' });

      expect((await as('owner').patch(`/v1/chronicle-chapters/${lore.id}`, { title: 'Lore' })).body).toMatchObject({ version: 0 });
      expect((await as('mira').patch(`/v1/chronicle-chapters/${lore.id}`, { content: 'First', version: 0 })).body).toMatchObject({
        version: 1,
      });
      const stale = await as('owner').patch(`/v1/chronicle-chapters/${lore.id}`, { content: 'Second', version: 0 });
      expect(stale.status).toBe(409);
      expect(stale.body).toMatchObject({ code: 'version-conflict' });
      expect((await as('owner').patch(`/v1/chronicle-chapters/${lore.id}`, { content: 'Second', version: 1 })).body).toMatchObject({
        content: 'Second',
        version: 2,
      });
    });

    it('checks the title, the content and the body size', async () => {
      const game = await chronicleGame();
      const post = (body: object) => as('owner').post('/v1/chronicle-chapters', { gameId: game.id, ...body });

      expect((await post({ title: '' })).status).toBe(400);
      expect((await post({ title: '   ' })).status).toBe(400);
      expect((await post({ title: 'x'.repeat(201) })).status).toBe(400);
      expect((await post({ title: 'T', visibility: 'friends' })).status).toBe(400);
      expect((await post({ title: 'T', campaignDate: 0 })).status).toBe(400);
      expect((await post({ title: 'T', campaignDate: 1.5 })).status).toBe(400);
      // 200000 characters fit, above the 100 KB of the global body parser
      const full = await post({ title: 'x'.repeat(200), content: 'é'.repeat(200_000) });
      expect(full.status).toBe(201);
      const tooLong = await post({ title: 'T', content: 'a'.repeat(200_001) });
      expect(tooLong.body).toMatchObject({ statusCode: 400, code: 'chapter-content-too-long' });
      const patched = await as('owner').patch(`/v1/chronicle-chapters/${(full.body as Chapter).id}`, { content: 'a'.repeat(200_001) });
      expect(patched.body).toMatchObject({ code: 'chapter-content-too-long' });
      const huge = await post({ title: 'T', content: 'a'.repeat(1_100_000) });
      expect(huge.body).toMatchObject({ statusCode: 413, code: 'payload-too-large' });
      const invalid = await request(e2e.server)
        .post('/v1/chronicle-chapters')
        .set('Authorization', token('owner'))
        .set('Content-Type', 'application/json')
        .send('{"gameId": ');
      expect(invalid.body).toMatchObject({ statusCode: 400, code: 'validation' });
    });

    it('holds at most 200 chapters per game, and lists them all in one call', async () => {
      const game = await chronicleGame();
      const now = new Date();
      await e2e.connection.collection('chronicle-chapters').insertMany(
        Array.from({ length: 200 }, (_, order) => ({
          _id: `chapter-${order}`,
          version: 0,
          gameId: game.id,
          title: `Chapter ${order}`,
          content: '',
          visibility: 'public',
          order,
          owner: 'e2e-owner',
          createdAt: now,
          updatedAt: now,
          updatedBy: 'e2e-owner',
        })) as never[],
      );

      const full = await as('owner').post('/v1/chronicle-chapters', { gameId: game.id, title: 'One more' });
      expect(full.status).toBe(409);
      expect(full.body).toMatchObject({ code: 'chronicle-chapter-limit' });
      const listed = await list('other', game.id);
      expect((listed.body as { content: Chapter[] }).content).toHaveLength(200);
      expect(titles(listed.body).slice(0, 3)).toEqual(['Chapter 0', 'Chapter 1', 'Chapter 2']);
      // Another game is not affected
      const other = await chronicleGame();
      await chapter(other.id);
    });
  });

  describe('order', () => {
    it('reorders the whole chronicle without moving the versions', async () => {
      const game = await chronicleGame();
      const a = await chapter(game.id, { title: 'A' });
      const b = await chapter(game.id, { title: 'B', visibility: 'master' });
      const c = await chapter(game.id, { title: 'C' });

      const reordered = await as('mira').put('/v1/chronicle-chapters/order', { gameId: game.id, ids: [c.id, a.id, b.id] });
      expect(reordered.status).toBe(200);
      expect(titles(reordered.body)).toEqual(['C', 'A', 'B']);
      expect((reordered.body as { content: Chapter[] }).content.map(chapter => [chapter.order, chapter.version])).toEqual([
        [0, 0],
        [1, 0],
        [2, 0],
      ]);
      // Everybody sees the new order
      expect(titles((await list('other', game.id)).body)).toEqual(['C', 'A']);

      // A save made on a copy read before the reorder keeps the new order
      const saved = await as('owner').patch(`/v1/chronicle-chapters/${a.id}`, { content: 'Edited', version: a.version });
      expect(saved.status).toBe(200);
      expect(saved.body).toMatchObject({ order: 1, version: 1 });
      expect(titles((await list('owner', game.id)).body)).toEqual(['C', 'A', 'B']);
    });

    it('needs every chapter once, and a master', async () => {
      const game = await chronicleGame();
      const a = await chapter(game.id, { title: 'A' });
      const b = await chapter(game.id, { title: 'B', visibility: 'master' });
      const order = (ids: string[], user: Who = 'owner') => as(user).put('/v1/chronicle-chapters/order', { gameId: game.id, ids });

      expect((await order([a.id])).body).toMatchObject({ statusCode: 400, code: 'chronicle-order-invalid' });
      expect((await order([a.id, b.id, 'other'])).body).toMatchObject({ code: 'chronicle-order-invalid' });
      expect((await order([a.id, a.id, b.id])).body).toMatchObject({ code: 'chronicle-order-invalid' });
      expect((await as('owner').put('/v1/chronicle-chapters/order', { gameId: game.id })).status).toBe(400);
      expect((await order([b.id, a.id], 'other')).status).toBe(403);
      expect((await order([b.id, a.id], 'sam')).status).toBe(403);
      expect((await as('owner').put('/v1/chronicle-chapters/order', { gameId: 'missing', ids: [] })).status).toBe(404);
      expect(titles((await list('owner', game.id)).body)).toEqual(['A', 'B']);
    });
  });

  describe('deleting the game', () => {
    const deliverGameDeleted = async () => {
      for (const { event } of e2e.events.published.filter(p => p.topic === GAME_DELETED)) {
        await e2e.app.get(KafkaChronicleGameEventConsumer).onGameDeleted(event as unknown as { data: { id: string } }, context);
      }
    };

    it('deletes its chapters and the images of its scope in media, and keeps the other games', async () => {
      const game = await chronicleGame();
      const other = await chronicleGame();
      await chapter(game.id, { title: 'Gone' });
      await chapter(game.id, { title: 'Gone too', visibility: 'master' });
      const kept = await chapter(other.id, { title: 'Kept' });
      e2e.events.clear();

      expect((await as('owner').delete(`/v1/strategic-games/${game.id}`)).status).toBe(204);
      await deliverGameDeleted();

      expect(await e2e.connection.collection('chronicle-chapters').countDocuments({ gameId: game.id })).toBe(0);
      expect((await as('owner').get(`/v1/chronicle-chapters/${kept.id}`)).status).toBe(200);
      expect(mediaCalls.deletedScopes).toEqual([`strategic-game:${game.id}`]);

      // A repeated message does nothing more than asking media again
      await deliverGameDeleted();
      expect((await as('owner').get(`/v1/chronicle-chapters/${kept.id}`)).status).toBe(200);
    });

    it('still deletes the chapters when media fails, and does not rethrow', async () => {
      const game = await chronicleGame();
      await chapter(game.id);
      mediaCalls.fail = true;
      e2e.events.clear();

      await as('owner').delete(`/v1/strategic-games/${game.id}`).expect(204);
      await expect(deliverGameDeleted()).resolves.toBeUndefined();

      expect(await e2e.connection.collection('chronicle-chapters').countDocuments({ gameId: game.id })).toBe(0);
      expect(mediaCalls.deletedScopes).toEqual([]);
    });

    it('ignores an event without a game id', async () => {
      await expect(e2e.app.get(KafkaChronicleGameEventConsumer).onGameDeleted({}, context)).resolves.toBeUndefined();
    });
  });
});
