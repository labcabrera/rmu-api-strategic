import type { KafkaContext } from '@nestjs/microservices';
import request from 'supertest';
import { KafkaFactionGameEventConsumer } from '../../src/modules/factions/interfaces/messaging/kafka.game-event-consumer.js';
import { startApp, USERS, type E2eApp, type UserName } from './support/app.js';
import { characterBody, createCharacter, createFaction, createGame, createItem } from './support/builders.js';
import { friendships } from './support/fakes.js';

type Body = Record<string, unknown>;

const context = (topic: string) => ({ getTopic: () => topic }) as unknown as KafkaContext;

// Spec 072: every member of a game reads everything of it; the players of a faction change it and what hangs from it.
describe('game visibility (e2e)', () => {
  let e2e: E2eApp;
  const carol = { sub: 'e2e-carol', groups: ['rmu-user'] };
  const dave = { sub: 'e2e-dave', groups: ['rmu-user'] };
  const erin = { sub: 'e2e-erin', groups: ['rmu-user'] };
  type Who = UserName | 'carol' | 'dave' | 'erin';
  const extra = { carol, dave, erin } as const;
  const token = (user: Who) => (user in extra ? `Bearer ${e2e.jwks.token(extra[user as keyof typeof extra])}` : e2e.auth(user as UserName));
  const as = (user: Who) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', token(user)),
    post: (path: string, body: object = {}) => request(e2e.server).post(path).set('Authorization', token(user)).send(body),
    put: (path: string, body: object = {}) => request(e2e.server).put(path).set('Authorization', token(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', token(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', token(user)),
  });
  const content = (body: unknown) => (body as { content: Body[] }).content;

  let gameId: string;
  let northId: string;
  let southId: string;
  let otherCharacterId: string;
  let carolCharacterId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    friendships.add(`${USERS.owner.sub}:${carol.sub}`);
    friendships.add(`${USERS.owner.sub}:${dave.sub}`);
    gameId = (await createGame(e2e)).id;
    northId = (await createFaction(e2e, gameId, 'owner', { name: 'North', management: { availableGold: 50 } })).id;
    southId = (await createFaction(e2e, gameId, 'owner', { name: 'South' })).id;
    // other plays in the North, carol in the South, dave watches
    otherCharacterId = (await createCharacter(e2e, gameId, northId, 'other', { name: 'Northman' })).id;
    await as('owner').put(`/v1/strategic-games/${gameId}/members/${carol.sub}`, { role: 'player' }).expect(200);
    await as('owner').put(`/v1/factions/${southId}/players/${carol.sub}`).expect(200);
    carolCharacterId = (
      (
        await as('carol')
          .post('/v1/characters', characterBody(gameId, southId, { name: 'Southman' }))
          .expect(201)
      ).body as { id: string }
    ).id;
    await as('owner').put(`/v1/strategic-games/${gameId}/members/${dave.sub}`, { role: 'spectator' }).expect(200);
  });

  it('shows every sheet to every member, with what each one can do', async () => {
    const own = (await as('other').get(`/v1/characters/${otherCharacterId}`)).body as Body;
    expect(own).toMatchObject({ access: 'write', name: 'Northman' });
    const theirs = (await as('other').get(`/v1/characters/${carolCharacterId}`)).body as Body;
    expect(theirs).toMatchObject({ access: 'read', name: 'Southman' });
    expect(theirs).toHaveProperty('statistics');
    expect(theirs).not.toHaveProperty('summary');
    expect((await as('other').get(`/v1/characters/${carolCharacterId}/healing-log`)).status).toBe(200);

    const listed = content((await as('other').get(`/v1/characters?q=gameId==${gameId}`)).body);
    expect(listed.map(c => `${c.name as string}:${c.access as string}`).sort()).toEqual(['Northman:write', 'Southman:read']);
    const watched = content((await as('dave').get(`/v1/characters?q=gameId==${gameId}`)).body);
    expect(watched.map(c => c.access)).toEqual(['read', 'read']);
    const mastered = content((await as('owner').get(`/v1/characters?q=gameId==${gameId}`)).body);
    expect(mastered.map(c => c.access)).toEqual(['manage', 'manage']);

    // Reading is not changing: the character of another faction is not theirs to change
    expect((await as('other').patch(`/v1/characters/${carolCharacterId}`, { name: 'Hijacked' })).status).toBe(403);
    expect((await as('dave').patch(`/v1/characters/${carolCharacterId}`, { name: 'Hijacked' })).status).toBe(403);
    expect((await as('other').patch(`/v1/characters/${otherCharacterId}`, { name: 'Northman II' })).status).toBe(200);
  });

  it('shows every faction whole to every member, with its players', async () => {
    const north = (await as('other').get(`/v1/factions/${northId}`)).body as Body;
    expect(north).toMatchObject({ access: 'write', management: { availableGold: 50 }, players: [USERS.other.sub] });
    const south = (await as('other').get(`/v1/factions/${southId}`)).body as Body;
    expect(south).toMatchObject({ id: southId, access: 'read', players: [carol.sub], playerNames: { [carol.sub]: `name-${carol.sub}` } });
    expect(south).toHaveProperty('management');
    expect(south).toHaveProperty('npcs');
    expect(content((await as('dave').get(`/v1/factions?q=gameId==${gameId}`)).body).map(f => f.access)).toEqual(['read', 'read']);
    expect(content((await as('owner').get(`/v1/factions?q=gameId==${gameId}`)).body).map(f => f.access)).toEqual(['manage', 'manage']);

    // Its players change its descriptions; its name and players are the masters'
    expect((await as('carol').patch(`/v1/factions/${southId}`, { shortDescription: 'Sunny' })).status).toBe(200);
    expect((await as('other').patch(`/v1/factions/${southId}`, { shortDescription: 'Cold' })).status).toBe(403);
    expect((await as('carol').patch(`/v1/factions/${southId}`, { name: 'Ours' })).status).toBe(403);
    expect((await as('carol').patch(`/v1/factions/${southId}`, { players: [carol.sub, USERS.other.sub] })).status).toBe(403);
    const players = await as('owner').patch(`/v1/factions/${southId}`, { players: [carol.sub, USERS.other.sub] });
    expect(players.status).toBe(200);
    expect(players.body).toMatchObject({ players: [carol.sub, USERS.other.sub] });
    const spectator = await as('owner').patch(`/v1/factions/${southId}`, { players: [dave.sub] });
    expect(spectator.status).toBe(400);
    expect(spectator.body).toMatchObject({ code: 'faction-player-not-a-player' });
  });

  it('lets the players of a faction add their friends to it, who join the game', async () => {
    friendships.add(`${carol.sub}:${erin.sub}`);
    friendships.add(`${carol.sub}:${dave.sub}`);
    const notFriend = await as('carol').put(`/v1/factions/${southId}/players/${USERS.other.sub}`);
    expect(notFriend.status).toBe(400);
    expect(notFriend.body).toMatchObject({ code: 'not-a-friend' });
    const spectator = await as('carol').put(`/v1/factions/${southId}/players/${dave.sub}`);
    expect(spectator.status).toBe(400);
    expect(spectator.body).toMatchObject({ code: 'faction-player-not-a-player' });
    expect((await as('other').put(`/v1/factions/${southId}/players/${erin.sub}`)).status).toBe(403);

    const added = await as('carol').put(`/v1/factions/${southId}/players/${erin.sub}`);
    expect(added.status).toBe(200);
    expect(added.body).toMatchObject({ players: [carol.sub, erin.sub], access: 'write' });
    const game = (await as('erin').get(`/v1/strategic-games/${gameId}`)).body as { members: { userId: string; role: string }[] };
    expect(game.members).toContainEqual(expect.objectContaining({ userId: erin.sub, role: 'player' }));
    expect((await as('erin').post('/v1/characters', characterBody(gameId, southId, { name: 'Erin' }))).status).toBe(201);

    // A player leaves, but does not take others out; a master does
    expect((await as('erin').delete(`/v1/factions/${southId}/players/${carol.sub}`)).status).toBe(403);
    expect((await as('erin').delete(`/v1/factions/${southId}/players/me`)).body).toMatchObject({ players: [carol.sub] });
    expect((await as('owner').delete(`/v1/factions/${southId}/players/${carol.sub}`)).body).toMatchObject({ players: [] });
    // Their characters stay in the faction, and they no longer change them
    expect((await as('carol').get(`/v1/characters/${carolCharacterId}`)).body).toMatchObject({ access: 'read', faction: { id: southId } });
    expect((await as('carol').patch(`/v1/characters/${carolCharacterId}`, { name: 'Mine?' })).status).toBe(403);
  });

  it('takes out of its factions whoever stops being a player of the game', async () => {
    const expelled = await as('owner').delete(`/v1/strategic-games/${gameId}/members/${carol.sub}`).expect(200);
    await e2e.app
      .get(KafkaFactionGameEventConsumer)
      .onGameUpdated(
        { data: expelled.body as { id: string; members: { userId: string; role: string }[] } },
        context('internal.rmu-strategic.game.updated.v1'),
      );
    expect((await as('owner').get(`/v1/factions/${southId}`)).body).toMatchObject({ players: [] });
    expect((await as('owner').get(`/v1/factions/${northId}`)).body).toMatchObject({ players: [USERS.other.sub] });
  });

  it('lets every member read the items, and the players of its faction change them', async () => {
    const northSword = await createItem(e2e, { gameId, characterId: otherCharacterId }, 'other');
    const southSword = await createItem(e2e, { gameId, characterId: carolCharacterId }, 'owner');
    const armory = await createItem(e2e, { gameId, factionId: southId }, 'owner');
    expect((await as('other').get(`/v1/items/${southSword.id}`)).status).toBe(200);
    expect((await as('other').get(`/v1/items/${armory.id}`)).status).toBe(200);
    expect(content((await as('dave').get(`/v1/items?q=gameId==${gameId}`)).body)).toHaveLength(3);
    expect(content((await as('other').get(`/v1/items?q=gameId==${gameId}`)).body)).toHaveLength(3);
    expect((await as('other').patch(`/v1/items/${southSword.id}`, { name: 'Taken' })).status).toBe(403);
    expect((await as('other').patch(`/v1/items/${armory.id}`, { name: 'Taken' })).status).toBe(403);
    expect((await as('carol').patch(`/v1/items/${armory.id}`, { name: 'Ours' })).status).toBe(200);
    expect((await as('other').patch(`/v1/items/${northSword.id}`, { name: 'Mine' })).status).toBe(200);
  });

  it('leaves giving experience to the masters', async () => {
    expect((await as('other').post(`/v1/characters/${otherCharacterId}/xp`, { xp: 1000 })).status).toBe(403);
    expect((await as('owner').post(`/v1/characters/${otherCharacterId}/xp`, { xp: 1000 })).status).toBe(200);
  });
});
