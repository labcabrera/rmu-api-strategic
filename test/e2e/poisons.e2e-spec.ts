/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- HTTP bodies read as loose JSON */
import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createFaction, createGame } from './support/builders.js';

type Body = Record<string, any>;

// Invented poison: the fake core tables have one muscle row per severity, each starting a round later and lasting 2 hours
const POISON = { name: 'Test venom', category: 'muscle', level: 5 };

/** Workspace spec 042: poison RR, poisonings, antidotes, rest and coated weapons. */
describe('poisons (e2e)', () => {
  let e2e: E2eApp;
  let factionId: string;
  let characterId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    const gameId = (await createGame(e2e)).id;
    factionId = (await createFaction(e2e, gameId, 'owner', { name: 'Realm', management: { availableGold: 100, availableXP: 0 } })).id;
    characterId = (await createCharacter(e2e, gameId, factionId, 'owner', { name: 'Taster' })).id;
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', e2e.auth(user)),
  });
  const base = () => `/v1/characters/${characterId}`;
  const buy = async (itemTypeId: string, amount = 1) => {
    const buyer = { kind: 'character', id: characterId };
    const response = await as('owner').post('/v1/items/purchases', { buyer: { kind: 'faction', id: factionId }, itemTypeId, amount });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    const item = response.body.item as Body;
    const moved = await as('owner').post(`/v1/items/${item.id}/transfer`, { to: buyer });
    expect(moved.status, JSON.stringify(moved.body)).toBe(201);
    return (moved.body.item ?? item) as Body;
  };

  it('poisons the character on a failed RR, advances the stages resting and neutralizes with an antidote', async () => {
    // 20 + 0 - 2 x 5 = 10 against 50: failure 40, moderate
    const poisoned = await as('owner').post(`${base()}/poisonings`, { poison: POISON, roll: 20 });
    expect(poisoned.status, JSON.stringify(poisoned.body)).toBe(200);
    expect(poisoned.body.rr).toMatchObject({ total: 10, required: 50, resisted: false, failure: 40, severity: 'moderate' });
    const injuryId = poisoned.body.injuryId as string;
    let injury = poisoned.body.character.injuries.find((one: Body) => one.id === injuryId);
    expect(injury).toMatchObject({
      type: 'poison-disease',
      severity: 'medium',
      penalty: -5,
      poison: { severity: 'moderate', elapsedRounds: 0 },
    });

    const rested = await as('owner').post(`${base()}/rest`, { hours: 1 });
    expect(rested.status, JSON.stringify(rested.body)).toBe(200);
    injury = rested.body.injuries.find((one: Body) => one.id === injuryId);
    expect(injury).toMatchObject({ penalty: -15, status: 'active', poison: { elapsedRounds: 360 } });
    // A poisoning in progress has no recovery roll
    const recovery = await as('owner').post(`${base()}/injuries/${injuryId}/recovery`, { roll: 50 });
    expect(recovery.status).toBe(400);
    expect(recovery.body).toMatchObject({ code: 'err-injury-poison-active' });

    const cure = await buy('e2e-cure', 2);
    const antidote = await as('owner').post(`${base()}/injuries/${injuryId}/antidote`, { source: 'item', itemId: cure.id });
    expect(antidote.status, JSON.stringify(antidote.body)).toBe(200);
    expect(antidote.body).toMatchObject({ injuryId, neutralized: true });
    injury = antidote.body.character.injuries.find((one: Body) => one.id === injuryId);
    expect(injury).toMatchObject({ penalty: 0, status: 'healed', poison: { neutralized: true, finished: true } });
    expect(((await as('owner').get(`/v1/items/${cure.id}`)).body as Body).amount).toBe(1);
  });

  it('resists, rejects an unknown category and a wrong antidote', async () => {
    const resisted = await as('owner').post(`${base()}/poisonings`, { poison: POISON, roll: 80 });
    expect(resisted.status).toBe(200);
    expect(resisted.body.rr).toMatchObject({ resisted: true });
    expect(resisted.body.injuryId).toBeUndefined();
    expect((await as('owner').post(`${base()}/poisonings`, { poison: { ...POISON, category: 'acid' } })).status).toBe(400);
    const poisoned = await as('owner').post(`${base()}/poisonings`, { poison: POISON, roll: 20 });
    const wrong = await as('owner').post(`${base()}/injuries/${poisoned.body.injuryId}/antidote`, {
      source: 'external',
      name: 'Wrong herb',
      categories: ['nerve'],
      level: 20,
    });
    expect(wrong.body).toMatchObject({ neutralized: false });
  });

  it('coats a weapon with a dose of a paste poison and removes it', async () => {
    const sword = await buy('sword');
    const venom = await buy('e2e-venom', 2);
    const stone = await buy('stone');
    expect((await as('owner').post(`/v1/items/${stone.id}/coating`, { poisonItemId: venom.id })).status).toBe(400);
    const coated = await as('owner').post(`/v1/items/${sword.id}/coating`, { poisonItemId: venom.id });
    expect(coated.status, JSON.stringify(coated.body)).toBe(201);
    expect(coated.body.item.coating).toMatchObject({
      itemTypeId: 'e2e-venom',
      poison: { category: 'muscle', level: 4, form: 'paste', name: 'E2E venom' },
      hoursLeft: 168,
    });
    expect(coated.body.entry).toMatchObject({ kind: 'discard', itemId: venom.id, amount: 1 });
    expect(((await as('owner').get(`/v1/items/${venom.id}`)).body as Body).amount).toBe(1);
    const removed = await as('owner').delete(`/v1/items/${sword.id}/coating`);
    expect(removed.status).toBe(200);
    expect(removed.body.coating).toBeNull();
  });
});
