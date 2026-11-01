/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- HTTP bodies read as loose JSON */
import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { characterBody, createFaction, createGame } from './support/builders.js';
import { RACE } from './support/fakes.js';

type Body = Record<string, any>;

/**
 * Workspace spec 064: an alchemist enchants an item of its faction. The spells, the list and the alchemy tables are the
 * invented ones of support/fakes.ts. Plan of work (2, per unit) + weapon (4) + adder (1): 7 days, item level 4,
 * 28 sp of materials and 14 sp of labour → 2.8 gold paid at the start, 4.2 gold of enchantment.
 */
describe('enchantments (e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;
  let factionId: string;
  let alchemistId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object = {}) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', e2e.auth(user)),
  });
  const ok = (response: request.Response, status = 200): Body => {
    expect(response.status, JSON.stringify(response.body)).toBe(status);
    return response.body as Body;
  };
  const gold = async () => ok(await as('owner').get(`/v1/factions/${factionId}`)).management.availableGold as number;
  const buySword = async () =>
    ok(await as('owner').post('/v1/items/purchases', { buyer: { kind: 'faction', id: factionId }, itemTypeId: 'sword' }), 201).item as Body;

  const SPELLS = [{ spellId: 'spell-alc-work' }, { spellId: 'spell-alc-weapon' }, { spellId: 'spell-alc-adder' }];
  const requestFor = (itemId: string, overrides: Record<string, unknown> = {}) => ({ alchemistId, itemId, spells: SPELLS, ...overrides });

  beforeEach(async () => {
    await e2e.clear();
    gameId = (await createGame(e2e)).id;
    factionId = (await createFaction(e2e, gameId, 'owner', { name: 'Realm', management: { availableGold: 100 } })).id;
    const info = { raceId: RACE.id, professionId: 'magician', sizeId: 'medium', realmTypes: ['essence'], height: 1.8, weight: 80 };
    alchemistId = ok(await as('owner').post('/v1/characters', characterBody(gameId, factionId, { name: 'Alchemist', info })), 201).id;
    // Ranks are a correction of the sheet: only an admin adds them
    ok(
      await as('admin').post(`/v1/characters/${alchemistId}/skills`, {
        skillId: 'base-spell-list',
        specialization: 'e2e-alchemy',
        ranks: 5,
      }),
      201,
    );
  });

  it('quotes, starts with a failed SCR, rolls the failure, progresses, adjusts and completes the enchantment', async () => {
    const sword = await buySword();
    expect(await gold()).toBe(90);

    const plan = ok(await as('owner').post('/v1/enchantments/quote', requestFor(sword.id)));
    expect(plan).toMatchObject({
      batchSize: 1,
      powerLevel: 'superior',
      powerMultiplier: 1,
      baseDays: 7,
      workingDays: 7,
      ppPerDay: 7,
      itemLevel: 4,
      materialCost: 2.8,
      laborCost: 1.4,
      enchantmentCost: 4.2,
      paidAtStart: 2.8,
      marketValue: 14.2,
      maxAlchemists: 3,
    });
    const weapon = plan.spells[1];
    expect(weapon).toMatchObject({
      spellId: 'spell-alc-weapon',
      listCode: 'e2e-alchemy',
      listSkillId: 'base-spell-list',
      type: 'alchemical',
    });
    expect(weapon.scrModifiers.map((m: Body) => m.key)).toEqual(['ranks', 'realm-stat', 'list-type']);

    // The weapon spell fails: a total of -5
    const scrRolls = { 'spell-alc-work': 50, 'spell-alc-weapon': -weapon.scrBonus - 5, 'spell-alc-adder': 50 };
    const started = ok(await as('owner').post('/v1/enchantments', { ...requestFor(sword.id), scrRolls }), 201);
    expect(started).toMatchObject({
      status: 'pending-failures',
      alchemistName: 'Alchemist',
      itemName: 'E2E sword',
      payer: { kind: 'faction', id: factionId },
      paid: 2.8,
      daysCompleted: 0,
    });
    expect(started.scr[1]).toMatchObject({ spellId: 'spell-alc-weapon', total: -5, failed: true, failureRoll: null });
    expect(await gold()).toBe(87.2);
    const id = started.id as string;

    // Another project on the same item, and work before the failure roll
    expect(ok(await as('owner').post('/v1/enchantments', { ...requestFor(sword.id), scrRolls }), 409)).toMatchObject({
      code: 'err-enchantment-item-busy',
    });
    expect(ok(await as('owner').post(`/v1/enchantments/${id}/progress`, { days: 1 }), 409)).toMatchObject({
      code: 'err-enchantment-failure-rolls-pending',
    });

    // The failure roll plus the negative SCR modifiers falls on the serendipity row
    const failureModifier = started.scr[1].failureModifier as number;
    const rolled = ok(
      await as('owner').post(`/v1/enchantments/${id}/failure-rolls`, { rolls: { 'spell-alc-weapon': 66 - failureModifier } }),
    );
    expect(rolled.status).toBe('in-progress');
    expect(rolled.scr[1].failure).toEqual({ table: 'bonus', min: 66, max: 66, text: 'E2E lucky accident', serendipity: 'minor' });

    ok(await as('owner').post(`/v1/enchantments/${id}/progress`, { days: 5 }));
    expect(ok(await as('owner').post(`/v1/enchantments/${id}/complete`), 409)).toMatchObject({ code: 'err-enchantment-not-finished' });
    expect(ok(await as('other').post(`/v1/enchantments/${id}/progress`, { days: 1 }), 403)).toBeDefined();

    // The failure result costs two more days and one gold
    const current = ok(await as('owner').get(`/v1/enchantments/${id}`));
    expect(ok(await as('owner').patch(`/v1/enchantments/${id}`, { extraDays: 2, version: current.version - 1 }), 409)).toMatchObject({
      code: 'version-conflict',
    });
    const adjusted = ok(
      await as('owner').patch(`/v1/enchantments/${id}`, { extraDays: 2, extraCost: 1, notes: 'E2E delay', version: current.version }),
    );
    expect(adjusted).toMatchObject({ extraDays: 2, extraCost: 1, notes: 'E2E delay', paid: 3.8 });
    expect(await gold()).toBe(86.2);
    // Totals, not increments: a lower extra cost gives the difference back
    expect(ok(await as('owner').patch(`/v1/enchantments/${id}`, { extraCost: 3 }))).toMatchObject({ extraCost: 3, paid: 5.8 });
    expect(ok(await as('owner').patch(`/v1/enchantments/${id}`, { extraCost: 1, extraDays: 2 }))).toMatchObject({
      extraCost: 1,
      extraDays: 2,
      paid: 5.8,
      refunded: 2,
    });
    expect(await gold()).toBe(86.2);

    // Suspended days do not count; the days never go beyond 9
    ok(await as('owner').post(`/v1/enchantments/${id}/suspend`));
    expect(ok(await as('owner').post(`/v1/enchantments/${id}/progress`, { days: 1 }), 409)).toMatchObject({
      code: 'err-enchantment-status',
    });
    ok(await as('owner').post(`/v1/enchantments/${id}/resume`));
    expect(ok(await as('owner').post(`/v1/enchantments/${id}/progress`, { days: 10 })).daysCompleted).toBe(9);

    const { project, item } = ok(await as('owner').post(`/v1/enchantments/${id}/complete`));
    expect(project).toMatchObject({ status: 'completed', completedAt: expect.any(String) });
    expect(item).toMatchObject({
      id: sword.id,
      value: 14.2,
      enchantment: {
        projectId: id,
        itemLevel: 4,
        alchemistId,
        alchemistName: 'Alchemist',
        properties: [{ kind: 'spell-adder', value: 1 }],
      },
    });
    expect(item.enchantment.spells.map((s: Body) => s.spellId)).toEqual(['spell-alc-work', 'spell-alc-weapon', 'spell-alc-adder']);
    const own = (item.modifiers as Body[]).filter(m => m.type === 'enchantment');
    expect(own).toEqual([
      expect.objectContaining({
        appliesTo: 'attack',
        value: 10,
        description: 'E2E spell-alc-weapon (+10)',
        source: expect.objectContaining({ kind: 'enchantment', projectId: id }),
      }),
      expect.objectContaining({ appliesTo: 'breakage', value: 4 }),
    ]);
    expect(item.condition).toEqual({ breakagePenalty: 0, broken: false });

    // An enchanted item is enchanted once
    expect(ok(await as('owner').post('/v1/enchantments/quote', requestFor(sword.id)), 409)).toMatchObject({
      code: 'err-enchantment-item-enchanted',
    });
    const ledger = ok(await as('owner').get(`/v1/item-ledger?q=itemId==${sword.id}`));
    expect((ledger.content as Body[]).map(entry => [entry.kind, entry.payments.map((p: Body) => p.gold)])).toEqual([
      ['enchant-refund', [2]],
      ['enchant', [-2]],
      ['enchant', [-1]],
      ['enchant', [-2.8]],
      ['purchase', [-10]],
    ]);
    const listed = ok(await as('owner').get(`/v1/enchantments?q=itemId==${sword.id};status==completed`));
    expect(listed.content.map((p: Body) => p.id)).toEqual([id]);
    ok(await as('owner').delete(`/v1/enchantments/${id}`), 204);
  });

  it('cancels a project and gives back the materials of the days not worked', async () => {
    const sword = await buySword();
    const scrRolls = { 'spell-alc-work': 80, 'spell-alc-weapon': 80, 'spell-alc-adder': 80 };
    const started = ok(await as('owner').post('/v1/enchantments', { ...requestFor(sword.id), scrRolls }), 201);
    expect(started.status).toBe('in-progress');
    expect(await gold()).toBe(87.2);
    ok(await as('owner').post(`/v1/enchantments/${started.id}/progress`, { days: 3 }));
    expect(ok(await as('owner').delete(`/v1/enchantments/${started.id}`), 409)).toMatchObject({ code: 'err-enchantment-status' });

    // 2.8 × 4 / 7
    const cancelled = ok(await as('owner').post(`/v1/enchantments/${started.id}/cancel`));
    expect(cancelled).toMatchObject({ status: 'cancelled', refunded: 1.6 });
    expect(await gold()).toBe(88.8);
    expect(ok(await as('owner').post(`/v1/enchantments/${started.id}/cancel`), 409)).toMatchObject({ code: 'err-enchantment-status' });
    const ledger = ok(await as('owner').get(`/v1/item-ledger?q=itemId==${sword.id};kind==enchant-refund`));
    expect(ledger.content).toEqual([
      expect.objectContaining({ kind: 'enchant-refund', payments: [expect.objectContaining({ gold: 1.6 })] }),
    ]);
    // The item is free again, and a finished project can be deleted
    ok(await as('owner').post('/v1/enchantments/quote', requestFor(sword.id)));
    ok(await as('owner').delete(`/v1/enchantments/${started.id}`), 204);
    ok(await as('owner').get(`/v1/enchantments/${started.id}`), 404);
  });

  it('rejects unknown spells, plans without an alchemical spell, invalid batches, missing rolls and other users', async () => {
    const sword = await buySword();
    const quote = (body: object, user: UserName = 'owner') => as(user).post('/v1/enchantments/quote', body);
    // Level 9 is above the 5 ranks of the list
    expect(ok(await quote(requestFor(sword.id, { spells: [{ spellId: 'spell-alc-high' }] })), 400)).toMatchObject({
      code: 'err-enchantment-spell-unknown',
    });
    expect(ok(await quote(requestFor(sword.id, { spells: [{ spellId: 'spell-alc-plain' }] })), 400)).toMatchObject({
      code: 'err-enchantment-no-alchemical-spell',
    });
    expect(ok(await quote(requestFor(sword.id, { batchSize: 2 })), 400)).toMatchObject({ code: 'err-enchantment-batch-invalid' });
    expect(ok(await quote(requestFor(sword.id, { powerLevel: 'epic' })), 400)).toMatchObject({
      code: 'err-enchantment-power-level-unknown',
    });
    expect(ok(await quote(requestFor(sword.id, { powerLevel: 'heroic' }))).enchantmentCost).toBe(8.4);
    expect(ok(await quote(requestFor(sword.id), 'other'), 403)).toBeDefined();
    const missing = await as('owner').post('/v1/enchantments', { ...requestFor(sword.id), scrRolls: { 'spell-alc-work': 50 } });
    expect(ok(missing, 400)).toMatchObject({ code: 'err-enchantment-scr-roll-required' });
    // Nothing was charged
    expect(await gold()).toBe(90);
  });
});
