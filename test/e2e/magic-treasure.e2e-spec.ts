/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- HTTP bodies read as loose JSON */
import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createFaction, createGame } from './support/builders.js';
import { diceQueue } from './support/fakes.js';

type Body = Record<string, any>;

/**
 * Workspace spec 067: magic items of the catalog, magic items of the game master, charges, gem cut and settings, and
 * the random treasure. Catalog types, treasure tables and dice are the invented ones of support/fakes.ts.
 */
describe('magic items and treasure (e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;
  let factionId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object = {}) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', e2e.auth(user)),
  });
  const ok = (response: request.Response, status = 200): Body => {
    expect(response.status, JSON.stringify(response.body)).toBe(status);
    return response.body as Body;
  };
  const gold = async () => ok(await as('owner').get(`/v1/factions/${factionId}`)).management.availableGold as number;
  const buy = async (itemTypeId: string, extra: Record<string, unknown> = {}) =>
    ok(await as('owner').post('/v1/items/purchases', { buyer: { kind: 'faction', id: factionId }, itemTypeId, ...extra }), 201)
      .item as Body;
  const ledger = async (kind: string) => ok(await as('owner').get(`/v1/item-ledger?q=kind==${kind}`)).content as Body[];

  beforeEach(async () => {
    await e2e.clear();
    diceQueue.length = 0;
    gameId = (await createGame(e2e)).id;
    factionId = (await createFaction(e2e, gameId, 'owner', { name: 'Realm', management: { availableGold: 1000 } })).id;
  });

  it('buys a magic item of the catalog with its enchantment, OB modifier and standard price', async () => {
    const sword = await buy('e2e-flame-sword');
    expect(sword.enchantment).toMatchObject({
      source: 'catalog',
      projectId: null,
      itemLevel: 5,
      kind: 'weapon',
      attunement: false,
      properties: [{ kind: 'ob', value: 30, against: 'undead' }],
    });
    expect(sword.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'enchantment', appliesTo: 'attack', value: 15, source: { kind: 'catalog-magic' } }),
        expect.objectContaining({ type: 'enchantment', appliesTo: 'breakage', value: 5 }),
      ]),
    );
    expect(sword).toMatchObject({ value: 60, acquiredPrice: 60, charges: null, settings: [] });
    expect(await gold()).toBe(940);

    // Decision 6: the heroic multiplier (2 in the invented alchemy tables) only goes on the 50 of magic
    const quote = ok(
      await as('owner').post('/v1/items/price-quotes', { kind: 'purchase', itemTypeId: 'e2e-flame-sword', powerLevel: 'heroic' }),
    );
    expect(quote.price).toMatchObject({ unitBase: 110 });
  });

  it('quotes and makes a magic item from a base item with a standard table, paid or as a gift', async () => {
    const body = { baseItemTypeId: 'sword', kind: 'weapon', bonuses: [], spells: [], standard: { table: 'weapon', bonus: 10 } };
    const quote = ok(await as('owner').post('/v1/items/magic/quote', body));
    // The base sword (10) + 400 sp
    expect(quote).toMatchObject({ days: 20, itemLevel: 8, price: 50 });
    expect(quote.breakdown.length).toBeGreaterThan(0);
    const spells = ok(
      await as('owner').post('/v1/items/magic/quote', {
        ...body,
        standard: null,
        spells: [{ name: 'E2E light', level: 4, use: 'daily', perDay: 1 }],
      }),
    );
    // 4 days x (4 + 2) sp = 24 sp
    expect(spells).toMatchObject({ days: 4, itemLevel: 4, price: 12.4 });
    expect((await as('owner').post('/v1/items/magic/quote', { ...body, standard: { table: 'weapon', bonus: 25 } })).body).toMatchObject({
      statusCode: 400,
      code: 'err-magic-item-standard-unknown',
    });

    const paid = ok(
      await as('owner').post('/v1/items/magic', {
        ...body,
        gameId,
        factionId,
        name: 'Oathkeeper',
        payer: { kind: 'faction', id: factionId },
      }),
      201,
    );
    expect(paid).toMatchObject({ name: 'Oathkeeper', value: 50, acquiredPrice: 50, enchantment: { source: 'manual', itemLevel: 8 } });
    expect(paid.modifiers).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'enchantment', appliesTo: 'attack', value: 10 })]),
    );
    expect(await gold()).toBe(950);
    const gift = ok(await as('owner').post('/v1/items/magic', { ...body, gameId, factionId, price: 5 }), 201);
    expect(gift).toMatchObject({ value: 5, acquiredPrice: 0 });
    expect(await gold()).toBe(950);
    expect(await ledger('magic-item')).toHaveLength(2);
    expect((await as('other').post('/v1/items/magic', { ...body, gameId, factionId })).status).toBe(403);
  });

  it('spends, adds and recharges the charges of an item', async () => {
    const wand = await buy('e2e-wand');
    expect(wand).toMatchObject({ charges: { max: 5, current: 5 }, enchantment: { kind: 'charged', attunement: true } });
    const spent = ok(await as('owner').post(`/v1/items/${wand.id}/charges`, { delta: -3 }));
    expect(spent.charges).toEqual({ max: 5, current: 2 });
    expect((await as('owner').post(`/v1/items/${wand.id}/charges`, { delta: -3 })).body).toMatchObject({
      code: 'err-item-charges-invalid',
    });
    const before = await gold();
    const recharged = ok(await as('owner').post(`/v1/items/${wand.id}/charges`, { recharge: true }));
    expect(recharged.charges).toEqual({ max: 5, current: 5 });
    // 3 days (level of its spell) x 2 sp
    expect(await gold()).toBe(before - 0.6);
    expect(await ledger('recharge')).toHaveLength(1);
    expect((await as('owner').post(`/v1/items/${wand.id}/charges`, { recharge: true })).body).toMatchObject({
      code: 'err-item-charges-full',
    });
    const sword = await buy('sword');
    expect((await as('owner').post(`/v1/items/${sword.id}/charges`, { delta: 1 })).body).toMatchObject({ code: 'err-item-no-charges' });
  });

  it('cuts a gem once, and sets it in a ring and takes it out again', async () => {
    const gem = await buy('e2e-gem', { carats: 5 });
    expect(gem.value).toBe(10);
    const before = await gold();
    const cut = ok(await as('owner').post(`/v1/items/${gem.id}/cut`, { cutFactor: 5 }));
    expect(cut).toMatchObject({ cutFactor: 5, value: 50 });
    expect(await gold()).toBe(before - 5);
    expect((await as('owner').post(`/v1/items/${gem.id}/cut`, { cutFactor: 10 })).status).toBe(409);
    expect((await as('owner').post(`/v1/items/${gem.id}/cut`, { cutFactor: 3 })).status).toBe(400);

    const ring = await buy('e2e-ring', { jewelryClass: 'quality', value: 15 });
    const set = ok(await as('owner').post(`/v1/items/${ring.id}/settings`, { gemItemId: gem.id }), 201);
    expect(set.value).toBe(ring.value + 50);
    expect(set.settings).toEqual([expect.objectContaining({ itemTypeId: 'e2e-gem', carats: 5, cutFactor: 5, value: 50, magic: null })]);
    expect((await as('owner').get(`/v1/items/${gem.id}`)).status).toBe(404);

    const unset = ok(await as('owner').delete(`/v1/items/${ring.id}/settings/0`));
    expect(unset).toMatchObject({ value: ring.value, settings: [] });
    const gems = ok(await as('owner').get(`/v1/items?q=itemTypeId==e2e-gem;factionId==${factionId}`)).content as Body[];
    expect(gems).toEqual([expect.objectContaining({ carats: 5, cutFactor: 5, value: 50 })]);
    expect((await as('owner').delete(`/v1/items/${ring.id}/settings/0`)).status).toBe(404);
    expect(await ledger('gem-set')).toHaveLength(1);
    expect(await ledger('gem-unset')).toHaveLength(1);
  });

  it('rolls a treasure from the codes and awards the chosen lines to a faction', async () => {
    const roll = ok(await as('owner').post('/v1/treasure/rolls', { codes: 'c, n, x, special lair, -', magic: ['normal'] }));
    expect(roll.codes).toEqual({ wealth: ['normal'], lifestyle: ['normal'], magic: ['normal', 'normal'] });
    expect(roll.warnings).toEqual(['treasure-special-code: special lair']);
    const lines = roll.lines as Body[];
    expect(lines.filter(line => line.kind === 'gold')).toEqual([expect.objectContaining({ gold: 2 })]);
    const items = lines.filter(line => line.kind === 'item');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ itemTypeId: 'sword', name: 'E2E +10 weapon', value: 15, magic: { kind: 'weapon', price: 15 } });
    expect(items[0].dice.length).toBeGreaterThan(0);

    const before = await gold();
    const award = ok(
      await as('owner').post('/v1/treasure/awards', {
        gameId,
        holder: { kind: 'faction', id: factionId },
        lines: [...lines.filter(l => l.kind !== 'note')],
      }),
      201,
    );
    expect(award.gold).toBe(2);
    expect(award.items).toHaveLength(2);
    expect(award.items[0]).toMatchObject({ itemTypeId: 'sword', value: 15, acquiredPrice: 0, enchantment: { source: 'treasure' } });
    expect(award.items[0].modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'enchantment', appliesTo: 'attack', value: 10, source: { kind: 'treasure' } }),
      ]),
    );
    expect(await gold()).toBe(before + 2);
    expect(await ledger('treasure')).toEqual([expect.objectContaining({ itemIds: award.items.map((item: Body) => item.id) })]);
  });

  it('undoes an award when a line fails, and only lets the managers of the holder award', async () => {
    const lines = [
      { kind: 'gold', gold: 5 },
      { kind: 'item', itemTypeId: 'e2e-flame-sword', name: 'Found sword', amount: null, value: 60 },
      { kind: 'item', itemTypeId: 'e2e-unknown', name: 'Lost', amount: null, value: 1 },
    ];
    const failed = await as('owner').post('/v1/treasure/awards', { gameId, holder: { kind: 'faction', id: factionId }, lines });
    expect(failed.status).toBe(400);
    expect(ok(await as('owner').get(`/v1/items?q=factionId==${factionId}`)).content).toEqual([]);
    expect(await gold()).toBe(1000);
    const forbidden = await as('other').post('/v1/treasure/awards', {
      gameId,
      holder: { kind: 'faction', id: factionId },
      lines: lines.slice(0, 1),
    });
    expect(forbidden.status).toBe(403);

    const named = ok(
      await as('owner').post('/v1/treasure/awards', { gameId, holder: { kind: 'faction', id: factionId }, lines: lines.slice(1, 2) }),
      201,
    );
    expect(named.items[0]).toMatchObject({ name: 'Found sword', acquiredPrice: 0, enchantment: { source: 'treasure', kind: 'weapon' } });
  });
});
