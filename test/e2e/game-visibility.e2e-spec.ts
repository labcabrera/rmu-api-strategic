import request from 'supertest';
import { startApp, USERS, type E2eApp, type UserName } from './support/app.js';
import { characterBody, createCharacter, createFaction, createGame, createItem } from './support/builders.js';
import { friendships } from './support/fakes.js';

type Body = Record<string, unknown>;

// Spec 071, decisions 11, 12 and 14: what the members of a game see of the factions, characters and items.
describe('game visibility (e2e)', () => {
  let e2e: E2eApp;
  const carol = { sub: 'e2e-carol', groups: ['rmu-user'] };
  const dave = { sub: 'e2e-dave', groups: ['rmu-user'] };
  type Who = UserName | 'carol' | 'dave';
  const token = (user: Who) =>
    user === 'carol' ? `Bearer ${e2e.jwks.token(carol)}` : user === 'dave' ? `Bearer ${e2e.jwks.token(dave)}` : e2e.auth(user);
  const as = (user: Who) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', token(user)),
    post: (path: string, body: object = {}) => request(e2e.server).post(path).set('Authorization', token(user)).send(body),
    put: (path: string, body: object) => request(e2e.server).put(path).set('Authorization', token(user)).send(body),
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
    carolCharacterId = (
      (
        await request(e2e.server)
          .post('/v1/characters')
          .set('Authorization', token('carol'))
          .send(characterBody(gameId, southId, { name: 'Southman' }))
          .expect(201)
      ).body as { id: string }
    ).id;
    await as('owner').put(`/v1/strategic-games/${gameId}/members/${dave.sub}`, { role: 'spectator' }).expect(200);
  });

  it('shows the sheet to the members of its faction and the summary to the others', async () => {
    const own = (await as('other').get(`/v1/characters/${otherCharacterId}`)).body as Body;
    expect(own).toMatchObject({ access: 'full', name: 'Northman' });
    expect(own).toHaveProperty('statistics');

    const theirs = (await as('other').get(`/v1/characters/${carolCharacterId}`)).body as Body;
    expect(theirs).toMatchObject({ id: carolCharacterId, name: 'Southman', summary: true, access: 'summary', owner: carol.sub });
    expect(theirs).toMatchObject({ faction: { id: southId }, info: { race: { id: 'race-001' } }, experience: { level: 0 } });
    expect(theirs).not.toHaveProperty('statistics');
    expect(theirs).not.toHaveProperty('skills');
    expect((await as('other').get(`/v1/characters/${carolCharacterId}/healing-log`)).status).toBe(403);

    const listed = content((await as('other').get(`/v1/characters?q=gameId==${gameId}`)).body);
    expect(listed.map(c => `${c.name as string}:${c.access as string}`).sort()).toEqual(['Northman:full', 'Southman:summary']);
    const watched = content((await as('dave').get(`/v1/characters?q=gameId==${gameId}`)).body);
    expect(watched.map(c => c.access)).toEqual(['summary', 'summary']);
    const mastered = content((await as('owner').get(`/v1/characters?q=gameId==${gameId}`)).body);
    expect(mastered.map(c => c.access)).toEqual(['full', 'full']);
    expect((await as('service').get(`/v1/characters/${carolCharacterId}`)).body).toMatchObject({ access: 'full' });

    // A second character of other in the South makes them a member of it
    await createCharacter(e2e, gameId, southId, 'other', { name: 'Spy' });
    expect((await as('other').get(`/v1/characters/${carolCharacterId}`)).body).toMatchObject({ access: 'full' });
  });

  it('shows the faction to its members and its cover to the others', async () => {
    const north = (await as('other').get(`/v1/factions/${northId}`)).body as Body;
    expect(north).toMatchObject({ access: 'full', management: { availableGold: 50 } });
    const south = (await as('other').get(`/v1/factions/${southId}`)).body as Body;
    expect(south).toMatchObject({ id: southId, name: 'South', summary: true, access: 'cover', leaderId: null });
    expect(south).not.toHaveProperty('management');
    expect(south).not.toHaveProperty('npcs');
    const listed = content((await as('dave').get(`/v1/factions?q=gameId==${gameId}`)).body);
    expect(listed.map(f => f.access)).toEqual(['cover', 'cover']);
    expect(content((await as('owner').get(`/v1/factions?q=gameId==${gameId}`)).body).map(f => f.access)).toEqual(['full', 'full']);

    // The leader of a faction is a member of it
    await as('owner').put(`/v1/strategic-games/${gameId}/members/${dave.sub}`, { role: 'player' }).expect(200);
    await request(e2e.server)
      .patch(`/v1/factions/${southId}`)
      .set('Authorization', e2e.auth('owner'))
      .send({ leaderId: dave.sub })
      .expect(200);
    expect((await as('dave').get(`/v1/factions/${southId}`)).body).toMatchObject({ access: 'full', leaderId: dave.sub });
    expect((await as('dave').get(`/v1/characters/${carolCharacterId}`)).body).toMatchObject({ access: 'full' });
  });

  it('lists and reads only the items of the characters and factions the user sees whole', async () => {
    const northSword = await createItem(e2e, { gameId, characterId: otherCharacterId }, 'other');
    const southSword = await createItem(e2e, { gameId, characterId: carolCharacterId }, 'owner');
    const armory = await createItem(e2e, { gameId, factionId: southId }, 'owner');
    expect((await as('other').get(`/v1/items/${northSword.id}`)).status).toBe(200);
    expect((await as('other').get(`/v1/items/${southSword.id}`)).status).toBe(403);
    expect((await as('other').get(`/v1/items/${armory.id}`)).status).toBe(403);
    expect(content((await as('other').get(`/v1/items?q=gameId==${gameId}`)).body).map(i => i.id)).toEqual([northSword.id]);
    expect(content((await as('dave').get(`/v1/items?q=gameId==${gameId}`)).body)).toEqual([]);
    expect(content((await as('owner').get(`/v1/items?q=gameId==${gameId}`)).body)).toHaveLength(3);
    expect(
      content((await as('carol').get(`/v1/items?q=gameId==${gameId}`)).body)
        .map(i => i.id)
        .sort(),
    ).toEqual([southSword.id, armory.id].sort());
  });

  it('leaves giving experience to the masters', async () => {
    expect((await as('other').post(`/v1/characters/${otherCharacterId}/xp`, { xp: 1000 })).status).toBe(403);
    expect((await as('owner').post(`/v1/characters/${otherCharacterId}/xp`, { xp: 1000 })).status).toBe(200);
  });
});
