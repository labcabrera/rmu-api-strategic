/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return -- HTTP bodies read as loose JSON */
import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createFaction, createGame } from './support/builders.js';
import { maneuverCalls } from './support/fakes.js';

type Body = Record<string, any>;

/**
 * Workspace spec 023: the life of an item of a faction (purchase, crafting with an enhancement, transfer to a soldier,
 * repair, sale) and the gold and ledger of each operation, with the invented catalog and maneuver tables of fakes.ts.
 */
describe('item operations (e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;
  let factionId: string;
  let smithId: string;
  let soldierId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    maneuverCalls.results = [];
    maneuverCalls.totals = [];
    maneuverCalls.tables = [];
    gameId = (await createGame(e2e)).id;
    factionId = (await createFaction(e2e, gameId, 'owner', { name: 'Realm', management: { availableGold: 100, availableXP: 0 } })).id;
    smithId = (
      await createCharacter(e2e, gameId, factionId, 'owner', {
        name: 'Smith',
        skills: [{ skillId: 'perception', specialization: null, ranks: 0 }],
      })
    ).id;
    soldierId = (await createCharacter(e2e, gameId, factionId, 'other', { name: 'Soldier' })).id;
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
  });
  const faction = { kind: 'faction', id: () => factionId };
  const holder = (kind: 'faction' | 'character', id: string) => ({ kind, id });
  const gold = async () => ((await as('owner').get(`/v1/factions/${factionId}`)).body as Body).management.availableGold as number;

  it('buys for the armory with the gold of the faction, with the catalog copy and its bonus', async () => {
    const response = await as('owner').post('/v1/items/purchases', { buyer: holder('faction', faction.id()), itemTypeId: 'sword' });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    const { item, entry } = response.body as Body;
    expect(item).toMatchObject({
      factionId,
      characterId: null,
      holder: { kind: 'faction', id: factionId },
      name: 'E2E sword',
      value: 10,
      acquiredPrice: 10,
      catalog: { cost: { average: 10 }, rarity: 'common', productionHours: 40, imageUrl: 'images/items/sword.png' },
    });
    expect(item.modifiers).toEqual([
      expect.objectContaining({ type: 'quality', appliesTo: 'attack', value: 5, source: { kind: 'catalog' } }),
    ]);
    expect(entry).toMatchObject({
      kind: 'purchase',
      to: { kind: 'faction', id: factionId },
      payments: [{ gold: -10 }],
      price: { total: 10 },
    });
    expect(await gold()).toBe(90);
  });

  it('applies the Trading percent to a purchase: 200% less the maneuver percent', async () => {
    // Invented percent table: the total itself. 70 + 30 = 100 -> 100% -> 10 gold
    const response = await as('owner').post('/v1/items/purchases', {
      buyer: holder('faction', faction.id()),
      itemTypeId: 'sword',
      trading: { roll: 70, bonus: 30, modifiers: [{ key: 'merchant', value: 20 }] },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    // 120 -> 200 - 120 = 80%
    expect((response.body as Body).entry.price).toMatchObject({
      unitBase: 10,
      unitPrice: 8,
      total: 8,
      trading: { total: 120, pricePercent: 80 },
    });
    expect(await gold()).toBe(92);
  });

  it('lets a player spend the coins of its character but not the gold of the faction', async () => {
    const denied = await as('other').post('/v1/items/purchases', { buyer: holder('character', soldierId), itemTypeId: 'sword' });
    expect(denied.status).toBe(403);
    expect(await gold()).toBe(100);
    // The game master gives the soldier coins, and the soldier buys with them
    expect((await as('owner').patch(`/v1/characters/${soldierId}/transfer-faction-gold`, { amount: 20 })).status).toBe(200);
    expect((await as('other').patch(`/v1/characters/${soldierId}/transfer-faction-gold`, { amount: 5 })).status).toBe(403);
    const bought = await as('other').post('/v1/items/purchases', {
      buyer: holder('character', soldierId),
      itemTypeId: 'sword',
      payer: 'holder',
    });
    expect(bought.status, JSON.stringify(bought.body)).toBe(201);
    const coins = await as('other').get(`/v1/items?q=characterId==${soldierId};itemTypeId==gold-coin`);
    expect((coins.body as Body).content[0]).toMatchObject({ amount: 10 });
    expect(await gold()).toBe(80);
  });

  it('rejects a purchase the faction cannot afford without charging anything', async () => {
    const response = await as('owner').post('/v1/items/purchases', {
      buyer: holder('faction', faction.id()),
      itemTypeId: 'sword',
      amount: 1,
      unitPrice: 101,
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'err-insufficient-gold' });
    expect(await gold()).toBe(100);
  });

  it('crafts a +5 sword for the faction, hands it to a soldier, repairs it and sells it', async () => {
    // A smith of the realm makes a sword with +5 to attacks; the faction pays materials (50% of 10) and the enhancement
    maneuverCalls.results = ['absolute-success'];
    const crafted = await as('owner').post('/v1/items/crafts', {
      itemTypeId: 'sword',
      maneuver: { actorId: smithId, skillId: 'metalcraft', bonus: 40, difficulty: 'h', roll: 90 },
      to: holder('faction', factionId),
      enhancements: [{ appliesTo: 'attack', value: 5, description: 'Fine edge' }],
      enhancementsCost: 20,
      name: 'Realm blade',
    });
    expect(crafted.status, JSON.stringify(crafted.body)).toBe(201);
    const { item, entry } = crafted.body as Body;
    expect(maneuverCalls.tables).toEqual(['crafting']);
    expect(maneuverCalls.totals).toEqual([120]);
    expect(entry).toMatchObject({
      kind: 'craft',
      outcome: 'crafted',
      actorId: smithId,
      payments: [{ gold: -25 }],
      maneuver: { total: 120, result: 'absolute-success' },
    });
    expect(item).toMatchObject({ name: 'Realm blade', value: 30, acquiredPrice: 25 });
    const own = (item.modifiers as Body[]).filter(modifier => modifier.source.kind === 'crafting');
    expect(own).toEqual([
      expect.objectContaining({ type: 'quality', appliesTo: 'attack', value: 5, source: { kind: 'crafting', ledgerEntryId: entry.id } }),
      expect.objectContaining({ type: 'quality', appliesTo: 'breakage', value: 10 }),
    ]);
    expect(await gold()).toBe(75);

    // The game master hands it to the soldier
    const given = await as('owner').post(`/v1/items/${item.id}/transfer`, { to: holder('character', soldierId) });
    expect(given.status, JSON.stringify(given.body)).toBe(201);
    expect((given.body as Body).item).toMatchObject({ characterId: soldierId, factionId: null, carried: false });

    // It breaks in a fight (a breakage modifier by hand here) and the smith repairs it: success on a broken item
    expect(
      (await as('owner').post(`/v1/items/${item.id}/modifiers`, { type: 'breakage', value: -20, appliesTo: 'all', broken: true })).status,
    ).toBe(201);
    maneuverCalls.results = ['success'];
    const repaired = await as('other').post(`/v1/items/${item.id}/repairs`, {
      maneuver: { actorId: smithId, skillId: 'metalcraft', bonus: 40, roll: 150 },
    });
    expect(repaired.status, JSON.stringify(repaired.body)).toBe(201);
    // 150 + 40 - 100 (broken) = 90
    expect(maneuverCalls.totals.at(-1)).toBe(90);
    expect((repaired.body as Body).entry).toMatchObject({ kind: 'repair', outcome: 'repaired-with-penalty', payments: [] });
    const breakage = ((repaired.body as Body).item.modifiers as Body[]).filter(modifier => modifier.type === 'breakage');
    expect(breakage).toEqual([expect.objectContaining({ value: -10, source: expect.objectContaining({ kind: 'repair' }) })]);
    expect((repaired.body as Body).item.condition).toEqual({ breakagePenalty: -10, broken: false });

    // Sold: value 30 x 50% x 50% (damaged) = 7.5, to the coins of the soldier
    const sold = await as('other').post(`/v1/items/${item.id}/sale`, {});
    expect(sold.status, JSON.stringify(sold.body)).toBe(201);
    expect((sold.body as Body).item).toBeNull();
    expect((sold.body as Body).entry.price).toMatchObject({
      unitBase: 30,
      salePercent: 50,
      conditionPercent: 50,
      condition: 'damaged',
      total: 7.5,
    });

    const ledger = await as('owner').get(`/v1/item-ledger?q=itemId==${item.id}`);
    expect(((ledger.body as Body).content as Body[]).map(row => row.kind)).toEqual(['sale', 'repair', 'transfer', 'craft']);
    const soldierLedger = await as('other').get(`/v1/item-ledger?q=holderIds==${soldierId}`);
    expect((soldierLedger.body as Body).content.length).toBe(3);
  });

  it('loses the materials of a failed craft and makes no item', async () => {
    maneuverCalls.results = ['failure'];
    const crafted = await as('owner').post('/v1/items/crafts', {
      itemTypeId: 'sword',
      maneuver: { actorId: smithId, bonus: 10, roll: 40 },
      payer: holder('faction', factionId),
      to: holder('faction', factionId),
    });
    expect(crafted.status, JSON.stringify(crafted.body)).toBe(201);
    expect(crafted.body).toMatchObject({ item: null, entry: { outcome: 'wasted', payments: [{ gold: -5 }] } });
    expect(await gold()).toBe(95);
  });

  it('splits a stack between holders and merges it into the stack the new holder has', async () => {
    const arrows = (await as('owner').post('/v1/items/purchases', { buyer: holder('faction', factionId), itemTypeId: 'arrow', amount: 20 }))
      .body as Body;
    await as('owner').post('/v1/items/purchases', {
      buyer: holder('character', smithId),
      itemTypeId: 'arrow',
      amount: 5,
      payer: 'faction',
    });
    const given = await as('owner').post(`/v1/items/${arrows.item.id}/transfer`, { to: holder('character', smithId), amount: 12 });
    expect(given.status, JSON.stringify(given.body)).toBe(201);
    expect((given.body as Body).item).toMatchObject({ characterId: smithId, amount: 17 });
    expect((await as('owner').get(`/v1/items/${arrows.item.id}`)).body).toMatchObject({ amount: 8 });
    // A player cannot give to another faction, and a sale of coins is refused
    const other = (await createFaction(e2e, gameId, 'owner', { name: 'Other' })).id;
    expect((await as('other').post(`/v1/items/${arrows.item.id}/transfer`, { to: holder('faction', other) })).status).toBe(403);
  });

  it('discards an item with an entry in the ledger and quotes prices without changing anything', async () => {
    const bought = (await as('owner').post('/v1/items/purchases', { buyer: holder('faction', factionId), itemTypeId: 'sword' }))
      .body as Body;
    const quote = await as('owner').post('/v1/items/price-quotes', { kind: 'sale', itemId: bought.item.id });
    expect(quote.status).toBe(200);
    expect(quote.body).toMatchObject({
      price: { total: 5 },
      rules: { salePercent: 50, conditionPercent: { intact: 100, damaged: 50, broken: 10 } },
    });
    const purchase = await as('owner').post('/v1/items/price-quotes', { kind: 'purchase', itemTypeId: 'sword', amount: 3 });
    expect(purchase.body).toMatchObject({ price: { unitPrice: 10, total: 30 } });
    expect(await gold()).toBe(90);

    const discarded = await as('owner').post(`/v1/items/${bought.item.id}/discard`, { note: 'Lost in the river' });
    expect(discarded.status, JSON.stringify(discarded.body)).toBe(201);
    expect(discarded.body).toMatchObject({ item: null, entry: { kind: 'discard', note: 'Lost in the river' } });
    expect((await as('owner').get(`/v1/items/${bought.item.id}`)).status).toBe(404);
    expect((await as('owner').get('/v1/economy-rules')).body).toMatchObject({ salePercent: 50, materialsPercent: 50 });
  });
});
