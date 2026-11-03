import request from 'supertest';
import { startApp, USERS, type E2eApp, type UserName } from './support/app.js';
import { characterBody, createCharacter, createGame, gameBody, gameWithFaction } from './support/builders.js';
import { friendships, REALM, realmAccess } from './support/fakes.js';

type Body = Record<string, unknown>;
type MemberBody = { userId: string; userName: string; role: string };

// Spec 071: members of a strategic game, join requests, access levels and the realm of the game.
describe('game members (e2e)', () => {
  let e2e: E2eApp;
  // A third user, friend of the owner, to be a co-master.
  const carol = { sub: 'e2e-carol', groups: ['rmu-user'] };
  type Who = UserName | 'carol';
  const token = (user: Who) => (user === 'carol' ? `Bearer ${e2e.jwks.token(carol)}` : e2e.auth(user));
  const as = (user: Who) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', token(user)),
    post: (path: string, body: object = {}) => request(e2e.server).post(path).set('Authorization', token(user)).send(body),
    put: (path: string, body: object) => request(e2e.server).put(path).set('Authorization', token(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', token(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', token(user)),
  });
  const members = (body: unknown) => ((body as { members: MemberBody[] }).members ?? []).map(m => `${m.userId}:${m.role}`);

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    friendships.add(`${USERS.owner.sub}:${carol.sub}`);
  });

  describe('adding and removing members', () => {
    it('lets the owner add a friend, and publishes the change for core', async () => {
      const game = await createGame(e2e);
      e2e.events.clear();
      const added = await as('owner').put(`/v1/strategic-games/${game.id}/members/${USERS.other.sub}`, { role: 'player' });
      expect(added.status).toBe(200);
      expect(members(added.body)).toEqual(['e2e-other:player']);
      expect(added.body).toMatchObject({ access: 'owner', joinRequests: [] });
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.game.updated.v1']);

      // The player reads the game and its members, but not the join requests
      const read = await as('other').get(`/v1/strategic-games/${game.id}`);
      expect(read.status).toBe(200);
      expect(read.body).toMatchObject({ access: 'player' });
      expect(read.body).not.toHaveProperty('joinRequests');
      expect(read.body).not.toHaveProperty('realmReadable');
      expect((await as('other').get(`/v1/strategic-games/${game.id}/members`)).body).toMatchObject({ joinRequests: null });
      expect((await as('other').get('/v1/strategic-games')).body).toMatchObject({ content: [{ id: game.id, access: 'player' }] });
    });

    it('only adds friends of the owner, up to the owner for co-masters', async () => {
      const game = await createGame(e2e);
      friendships.clear();
      const stranger = await as('owner').put(`/v1/strategic-games/${game.id}/members/${USERS.other.sub}`, { role: 'player' });
      expect(stranger.status).toBe(400);
      expect(stranger.body).toMatchObject({ code: 'not-a-friend' });
      friendships.add(`${USERS.owner.sub}:${USERS.other.sub}`);
      friendships.add(`${USERS.owner.sub}:${carol.sub}`);

      expect((await as('owner').put(`/v1/strategic-games/${game.id}/members/${carol.sub}`, { role: 'master' })).status).toBe(200);
      // A co-master adds players, not co-masters, and does not change the visibility
      expect((await as('carol').put(`/v1/strategic-games/${game.id}/members/${USERS.other.sub}`, { role: 'master' })).status).toBe(403);
      expect((await as('carol').put(`/v1/strategic-games/${game.id}/members/${USERS.other.sub}`, { role: 'player' })).status).toBe(200);
      expect((await as('carol').patch(`/v1/strategic-games/${game.id}`, { accessType: 'public' })).status).toBe(403);
      expect((await as('carol').patch(`/v1/strategic-games/${game.id}`, { name: 'Renamed' })).status).toBe(200);
      expect((await as('carol').get(`/v1/strategic-games/${game.id}`)).body).toMatchObject({ access: 'master', realmReadable: true });
      // Nor removes the owner's co-masters, nor deletes the game
      expect((await as('other').delete(`/v1/strategic-games/${game.id}/members/${carol.sub}`)).status).toBe(403);
      expect((await as('carol').delete(`/v1/strategic-games/${game.id}`)).status).toBe(403);
      // The owner is not a member
      const self = await as('owner').put(`/v1/strategic-games/${game.id}/members/${USERS.owner.sub}`, { role: 'player' });
      expect(self.status).toBe(400);
      expect((await as('other').put(`/v1/strategic-games/${game.id}/members/${USERS.other.sub}`, { role: 'master' })).status).toBe(403);
      expect((await as('owner').put(`/v1/strategic-games/${game.id}/members/${carol.sub}`, { role: 'owner' })).status).toBe(400);
    });

    it('lets a member leave and a master expel; an ex-player reads their character but does not change it', async () => {
      const { game, faction } = await gameWithFaction(e2e);
      const character = await createCharacter(e2e, game.id, faction.id, 'other');
      expect((await as('other').patch(`/v1/characters/${character.id}`, { name: 'Mine' })).status).toBe(200);

      const left = await as('other').delete(`/v1/strategic-games/${game.id}/members/me`);
      expect(left.status).toBe(200);
      expect(left.body).toMatchObject({ access: 'none' });
      expect((await as('other').get(`/v1/strategic-games/${game.id}`)).status).toBe(403);
      expect((await as('other').get(`/v1/characters/${character.id}`)).status).toBe(200);
      expect((await as('other').patch(`/v1/characters/${character.id}`, { name: 'Still mine?' })).status).toBe(403);
      expect((await as('owner').patch(`/v1/characters/${character.id}`, { name: 'Kept by the master' })).status).toBe(200);
      const again = await as('other').post('/v1/characters', characterBody(game.id, faction.id));
      expect(again.status).toBe(403);
      expect(again.body).toMatchObject({ code: 'not-a-player' });
      expect((await as('other').delete(`/v1/strategic-games/${game.id}/members/me`)).status).toBe(404);

      await as('owner').put(`/v1/strategic-games/${game.id}/members/${USERS.other.sub}`, { role: 'spectator' }).expect(200);
      const spectator = await as('other').post('/v1/characters', characterBody(game.id, faction.id));
      expect(spectator.status).toBe(403);
      expect((await as('owner').delete(`/v1/strategic-games/${game.id}/members/${USERS.other.sub}`)).status).toBe(200);
      expect(members((await as('owner').get(`/v1/strategic-games/${game.id}/members`)).body)).toEqual([]);
    });

    it('allows 50 members', async () => {
      const game = await createGame(e2e);
      for (let i = 0; i < 50; i++) {
        await as('admin').put(`/v1/strategic-games/${game.id}/members/user-${i}`, { role: 'spectator' }).expect(200);
      }
      const limit = await as('admin').put(`/v1/strategic-games/${game.id}/members/user-50`, { role: 'spectator' });
      expect(limit.status).toBe(409);
      expect(limit.body).toMatchObject({ code: 'member-limit' });
    });
  });

  describe('public games and join requests', () => {
    it('shows only the cover of a public game to a non-member, who asks to join and is approved', async () => {
      const { game, faction } = await gameWithFaction(e2e);
      await createCharacter(e2e, game.id, faction.id);
      await as('owner').patch(`/v1/strategic-games/${game.id}`, { accessType: 'public' }).expect(200);

      const cover = await as('carol').get(`/v1/strategic-games/${game.id}`);
      expect(cover.status).toBe(200);
      expect(cover.body).toMatchObject({ access: 'cover', name: 'E2E game' });
      expect(cover.body).not.toHaveProperty('members');
      expect((await as('carol').get(`/v1/characters?q=gameId==${game.id}`)).body).toMatchObject({ content: [] });
      expect((await as('carol').get(`/v1/factions/${faction.id}`)).status).toBe(403);
      expect((await as('carol').post('/v1/characters', characterBody(game.id, faction.id))).status).toBe(403);

      const asked = await as('carol').post(`/v1/strategic-games/${game.id}/join-requests`, { message: 'Can I play?' });
      expect(asked.status).toBe(201);
      const repeated = await as('carol').post(`/v1/strategic-games/${game.id}/join-requests`, {});
      expect(repeated.status).toBe(201);
      expect((await as('carol').get(`/v1/strategic-games/${game.id}/members`)).body).toMatchObject({
        members: [],
        joinRequests: [{ userId: carol.sub, userName: `name-${carol.sub}`, message: null }],
      });
      expect((await as('owner').get(`/v1/strategic-games/${game.id}`)).body).toMatchObject({
        joinRequests: [{ userId: carol.sub }],
      });

      expect((await as('carol').post(`/v1/strategic-games/${game.id}/join-requests/${carol.sub}/approve`)).status).toBe(403);
      const approved = await as('owner').post(`/v1/strategic-games/${game.id}/join-requests/${carol.sub}/approve`);
      expect(approved.status).toBe(201);
      expect(approved.body).toMatchObject({ joinRequests: [] });
      expect(members(approved.body)).toEqual([`${carol.sub}:player`]);
      const member = await as('carol').post(`/v1/strategic-games/${game.id}/join-requests`, {});
      expect(member.status).toBe(409);
      expect(member.body).toMatchObject({ code: 'already-member' });
      expect((await as('carol').post('/v1/characters', characterBody(game.id, faction.id))).status).toBe(201);
    });

    it('rejects a request, lets its user take it back, and hides private games', async () => {
      const game = await createGame(e2e, 'owner', { accessType: 'public' });
      await as('other').post(`/v1/strategic-games/${game.id}/join-requests`, {}).expect(201);
      await as('carol').post(`/v1/strategic-games/${game.id}/join-requests`, {}).expect(201);
      expect((await as('owner').delete(`/v1/strategic-games/${game.id}/join-requests/${USERS.other.sub}`)).status).toBe(200);
      expect((await as('carol').delete(`/v1/strategic-games/${game.id}/join-requests/me`)).status).toBe(200);
      expect((await as('owner').get(`/v1/strategic-games/${game.id}/members`)).body).toMatchObject({ joinRequests: [] });
      expect((await as('noRole').post(`/v1/strategic-games/${game.id}/join-requests`, {})).status).toBe(403);

      // Turning the game private drops the requests; a private game is not found by outsiders
      await as('carol').post(`/v1/strategic-games/${game.id}/join-requests`, {}).expect(201);
      const closed = await as('owner').patch(`/v1/strategic-games/${game.id}`, { accessType: 'private' });
      expect(closed.body).toMatchObject({ accessType: 'private', joinRequests: [] });
      expect((await as('carol').post(`/v1/strategic-games/${game.id}/join-requests`, {})).status).toBe(404);
      expect((await as('carol').get(`/v1/strategic-games/${game.id}/members`)).status).toBe(404);
    });
  });

  describe('the realm of the game', () => {
    it('needs a readable realm to create a game, and warns the masters when the owner loses it', async () => {
      realmAccess.set(`${REALM.id}:${USERS.owner.sub}`, 'none');
      const denied = await as('owner').post('/v1/strategic-games', gameBody({ name: 'No realm' }));
      expect(denied.status).toBe(400);
      expect(denied.body).toMatchObject({ code: 'realm-not-readable' });
      realmAccess.clear();

      const { game, faction } = await gameWithFaction(e2e);
      await as('owner').put(`/v1/strategic-games/${game.id}/members/${USERS.other.sub}`, { role: 'player' }).expect(200);
      realmAccess.set(`${REALM.id}:${USERS.owner.sub}`, 'none');
      expect((await as('owner').get(`/v1/strategic-games/${game.id}`)).body).toMatchObject({ realmReadable: false });
      const blocked = await as('other').post('/v1/characters', characterBody(game.id, faction.id));
      expect(blocked.status).toBe(400);
      expect(blocked.body).toMatchObject({ code: 'realm-not-readable' });
      // An admin creates games on any realm
      expect((await as('admin').post('/v1/strategic-games', gameBody({ name: 'Admin game' }))).status).toBe(201);
    });
  });

  it('reads the members only for members, admins and other APIs', async () => {
    const game = await createGame(e2e);
    expect((await as('other').get(`/v1/strategic-games/${game.id}/members`)).status).toBe(404);
    expect((await as('admin').get(`/v1/strategic-games/${game.id}/members`)).body).toMatchObject({ members: [], joinRequests: [] });
    expect((await as('service').get(`/v1/strategic-games/${game.id}/members`)).body).toMatchObject({ members: [] });
    expect((await as('service').get(`/v1/strategic-games/${game.id}`)).body).toMatchObject({ access: 'spectator' });
    expect(((await as('owner').get(`/v1/strategic-games/${game.id}`)).body as Body).realmReadable).toBe(true);
  });
});
