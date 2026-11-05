/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- HTTP bodies read as loose JSON */
import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createFaction, createGame, createItem, gameWithFaction } from './support/builders.js';
import { maneuverCalls } from './support/fakes.js';

type Body = Record<string, any>;

/**
 * Workspace spec 068 in strategic against the invented spec 068 fields of the core fakes: limits of a splint or a
 * cast, surgery, salve, temporary modifiers and the items a tactical game spent.
 */
describe('healing in combat, fear and morale (e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;
  let characterId: string;
  let gameVersion: number;

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
    // A character of a player (`other`) in the game of `owner`
    characterId = (await createCharacter(e2e, gameId, faction.id, 'other')).id;
    // `other` joined the game, which changed its version (spec 071)
    gameVersion = ((await as('owner').get(`/v1/strategic-games/${game.id}`)).body as { version: number }).version;
    maneuverCalls.results = [];
    maneuverCalls.totals = [];
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', e2e.auth(user)),
  });
  const base = () => `/v1/characters/${characterId}`;

  const addInjury = async (body: Record<string, unknown>): Promise<Body> => {
    const response = await as('owner').post(`${base()}/injuries`, body);
    expect(response.status).toBe(200);
    return (response.body as Body).injuries.slice(-1)[0] as Body;
  };
  const treat = (injuryId: string, body: Record<string, unknown>) =>
    as('owner').post(`${base()}/injuries/${injuryId}/treatments`, { healer: { name: 'Healer', bonus: 10 }, roll: 50, ...body });
  const injuryOf = (response: request.Response, injuryId: string): Body =>
    ((response.body as Body).injuries as Body[]).find(i => i.id === injuryId)!;

  it('a splinted leg keeps its pace until the master removes the limit; a cast leg the pace of its support', async () => {
    const leg = await addInjury({ type: 'bone', penalty: -10, location: 'leg' });
    const splinted = await treat(leg.id, { procedure: 'splint' });
    expect(splinted.status).toBe(200);
    expect(injuryOf(splinted, leg.id).limits).toEqual({ pace: 'jog' });

    const removed = await as('owner').patch(`${base()}/injuries/${leg.id}`, { limits: null });
    expect(removed.status).toBe(200);
    expect(injuryOf(removed, leg.id).limits).toBeNull();

    const other = await addInjury({ type: 'bone', penalty: -10, location: 'leg' });
    const cast = await treat(other.id, { procedure: 'cast', castSupport: 'cane', difficulty: 0 });
    expect(injuryOf(cast, other.id)).toMatchObject({ limits: { pace: 'walk', maneuverPenaltyFactor: 0.25 } });
    expect(injuryOf(cast, other.id).treatments[0]).toMatchObject({ castSupport: 'cane' });
    expect((await treat(other.id, { procedure: 'cast', castSupport: 'wheelchair', difficulty: 0 })).status).toBe(400);

    const healed = await as('owner').patch(`${base()}/injuries/${other.id}`, { status: 'healed' });
    expect(injuryOf(healed, other.id).limits).toBeNull();
  });

  it('an injury of surgeryRequired only admits surgery or magic; a salve keeps its modifier in the range of core', async () => {
    const organ = await addInjury({ type: 'organ', penalty: -20 });
    expect(organ.severity).toBe('medium');
    const refused = await treat(organ.id, { procedure: 'dress' });
    expect(refused.status).toBe(400);
    expect(refused.body).toMatchObject({ code: 'err-treatment-surgery-required' });
    expect((await treat(organ.id, { procedure: 'magic', roll: undefined })).status).toBe(200);

    const skin = await addInjury({ type: 'skin-tissue', penalty: -5 });
    const out = await treat(skin.id, { procedure: 'salve', salveModifier: 40, difficulty: 0 });
    expect(out.status).toBe(400);
    expect(out.body).toMatchObject({ code: 'err-treatment-salve-modifier-range' });
    const salved = await treat(skin.id, { procedure: 'salve', salveModifier: 30, difficulty: 0 });
    expect(salved.status).toBe(200);
    expect(injuryOf(salved, skin.id).treatments[0]).toMatchObject({ procedure: 'salve', salveModifier: 30, difficulty: 0 });
  });

  it('applies the temporary modifiers and the spent items of a tactical game once, and the master removes a modifier', async () => {
    // Coins: a stack without a price in the fakes (the spent units of a herb or a potion work the same)
    const arrows = await createItem(e2e, { gameId, characterId, itemTypeId: 'gold-coin', amount: 5 });
    const modifier = (id: string, value: number, days: number | null) => ({
      id,
      kind: 'morale',
      value,
      source: value > 0 ? 'morale-absolute-success' : 'morale-absolute-failure',
      days,
      createdAt: '2026-11-02T10:00:00.000Z',
      tacticalGameId: 'tactical-068',
    });
    const outcome = {
      tacticalGameId: 'tactical-068',
      actorId: 'actor-001',
      characterId,
      name: 'E2E character',
      hp: { start: 0, end: 0, delta: 0 },
      injuries: [],
      itemsConsumed: [{ itemId: arrows.id, amount: 2 }],
      temporaryModifiers: [modifier('tm-plus', 5, 30), modifier('tm-minus', -10, null)],
    };
    const applied = await as('service').post(`${base()}/tactical-outcomes`, outcome);
    expect(applied.status).toBe(200);
    expect((applied.body as Body).temporaryModifiers).toEqual([
      expect.objectContaining({ id: 'tm-plus', value: 5, expiresGameDay: 31 }),
      expect.objectContaining({ id: 'tm-minus', value: -10, expiresGameDay: null }),
    ]);
    expect(((await as('other').get(`/v1/items/${arrows.id}`)).body as Body).amount).toBe(3);
    const ledger = (await as('owner').get(`/v1/item-ledger?q=itemId==${arrows.id};kind==consumed`)).body as Body;
    expect(ledger.content).toEqual([expect.objectContaining({ kind: 'consumed', amount: 2, note: 'tactical-outcome:tactical-068' })]);

    expect((await as('service').post(`${base()}/tactical-outcomes`, outcome)).status).toBe(200);
    expect(((await as('other').get(`/v1/items/${arrows.id}`)).body as Body).amount).toBe(3);

    expect((await as('other').delete(`${base()}/temporary-modifiers/tm-minus`)).status).toBe(403);
    const removed = await as('owner').delete(`${base()}/temporary-modifiers/tm-minus`);
    expect(removed.status).toBe(200);
    expect(((removed.body as Body).temporaryModifiers as Body[]).map(m => m.id)).toEqual(['tm-plus']);
    const missing = await as('owner').delete(`${base()}/temporary-modifiers/tm-minus`);
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ code: 'err-temporary-modifier-not-found' });

    // A month of the campaign later the +5 is gone, and the log says so
    const passed = await as('owner').post(`/v1/strategic-games/${gameId}/pass-time`, { days: 30, hours: 0, version: gameVersion });
    expect(passed.status).toBe(200);
    expect(((await as('owner').get(base())).body as Body).temporaryModifiers).toEqual([]);
    const log = (await as('owner').get(`${base()}/healing-log`)).body as Body;
    expect(log.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'manual', summary: expect.objectContaining({ action: 'temporary-modifiers-expired' }) }),
      ]),
    );
  });

  it('exports the limits of the injuries and the days left of the temporary modifiers, counted again on import', async () => {
    const leg = await addInjury({ type: 'bone', penalty: -10, location: 'leg' });
    await treat(leg.id, { procedure: 'splint' });
    const outcome = {
      tacticalGameId: 'tactical-070',
      actorId: 'actor-001',
      characterId,
      hp: { start: 0, end: 0, delta: 0 },
      injuries: [],
      temporaryModifiers: [
        { id: 'tm-1', kind: 'fear-rr', value: 20, source: 'rally-unusual', days: 10, createdAt: '2026-11-02T10:00:00.000Z' },
      ],
    };
    expect((await as('service').post(`${base()}/tactical-outcomes`, outcome)).status).toBe(200);
    // Three days later in the source campaign
    expect((await as('owner').post(`/v1/strategic-games/${gameId}/pass-time`, { days: 3, hours: 0, version: gameVersion })).status).toBe(
      200,
    );
    const exported = await as('owner').get(`${base()}/export`);
    expect(exported.status).toBe(200);
    const file = exported.body as Body;
    expect(file.formatVersion).toBe(14);
    expect(file.data.character.injuries[0].limits).toEqual({ pace: 'jog' });
    expect(file.data.character.temporaryModifiers).toEqual([
      {
        id: 'tm-1',
        kind: 'fear-rr',
        value: 20,
        source: 'rally-unusual',
        days: 10,
        createdAt: '2026-11-02T10:00:00.000Z',
        remainingDays: 7,
      },
    ]);

    // The destination campaign is on day 1
    const target = await createGame(e2e, 'other');
    const targetFaction = await createFaction(e2e, target.id, 'other');
    const imported = await request(e2e.server)
      .post(`/v1/factions/${targetFaction.id}/character-imports`)
      .set('Authorization', e2e.auth('other'))
      .set('X-RMU-File-Name', 'test.rmu.json')
      .send(file);
    expect(imported.status, JSON.stringify(imported.body)).toBe(200);
    const created = (await as('other').get(`/v1/characters/${(imported.body as Body).characterIds[0]}`)).body as Body;
    expect(created.injuries[0].limits).toEqual({ pace: 'jog' });
    expect(created.temporaryModifiers).toEqual([expect.objectContaining({ id: 'tm-1', expiresGameDay: 8, tacticalGameId: null })]);
  });

  it('a spent item that is not of the character is ignored', async () => {
    const { game, faction } = await gameWithFaction(e2e);
    const stranger = await createCharacter(e2e, game.id, faction.id);
    const arrows = await createItem(e2e, { gameId: game.id, characterId: stranger.id, itemTypeId: 'gold-coin', amount: 5 });
    const applied = await as('service').post(`${base()}/tactical-outcomes`, {
      tacticalGameId: 'tactical-069',
      actorId: 'actor-001',
      characterId,
      hp: { start: 0, end: 0, delta: 0 },
      injuries: [],
      itemsConsumed: [{ itemId: arrows.id, amount: 1 }],
    });
    expect(applied.status).toBe(200);
    expect(((await as('owner').get(`/v1/items/${arrows.id}`)).body as Body).amount).toBe(5);
  });
});
