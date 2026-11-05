/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- HTTP bodies read as loose JSON */
import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createFaction, createGame } from './support/builders.js';
import { maneuverCalls } from './support/fakes.js';

type Body = Record<string, any>;

/**
 * Workspace spec 062 with invented catalog types (fakes): gems by carats, jewelry by class, other sizes, the sale to a
 * jeweler, and the herbs in play (a dose, a treatment with a herb and a search).
 */
describe('treasure law goods (e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;
  let factionId: string;
  let characterId: string;

  beforeAll(async () => {
    e2e = await startApp({ RMU_STRATEGIC_JEWELER_PERCENT: '3' });
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    gameId = (await createGame(e2e)).id;
    factionId = (await createFaction(e2e, gameId, 'owner', { name: 'Realm', management: { availableGold: 1000 } })).id;
    characterId = (await createCharacter(e2e, gameId, factionId, 'owner', { name: 'Herbalist' })).id;
    maneuverCalls.results = [];
    maneuverCalls.totals = [];
    maneuverCalls.tables = [];
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    importFile: (path: string, file: object) =>
      request(e2e.server).post(path).set('Authorization', e2e.auth(user)).set('X-RMU-File-Name', 'test.rmu.json').send(file),
  });
  const ok = (response: request.Response, status = 200) => {
    expect(response.status, JSON.stringify(response.body)).toBe(status);
    return response.body as Body;
  };
  const base = () => `/v1/characters/${characterId}`;
  const faction = () => ({ kind: 'faction', id: factionId });
  /** Buys for the faction and gives it to the character. */
  const give = async (itemTypeId: string, amount = 1) => {
    const bought = ok(await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId, amount }), 201);
    const moved = ok(await as('owner').post(`/v1/items/${bought.item.id}/transfer`, { to: { kind: 'character', id: characterId } }), 201);
    return (moved.item ?? bought.item) as Body;
  };
  /** Hits of the character below its maximum (as the character processor computes it): answers the maximum. */
  const wound = async (lost: number): Promise<number> => {
    const max = ok(await as('owner').get(base())).hp.max as number;
    await e2e.connection.collection('characters').updateOne({ _id: characterId as never }, { $set: { 'hp.current': max - lost } });
    return max;
  };

  describe('instances and prices', () => {
    it('prices a gem by its carats and cut, a jewel by its class and an item of another size', async () => {
      const gem = ok(
        await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId: 'e2e-gem', carats: 5, cutFactor: 5 }),
        201,
      );
      // 2 gold per carat x 5 carats x 5 (modern cut)
      expect(gem.item).toMatchObject({ category: 'gem', carats: 5, cutFactor: 5, value: 50, acquiredPrice: 50 });
      expect(gem.entry.price).toMatchObject({ unitBase: 50, total: 50 });

      const big = ok(await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId: 'sword', size: 'big' }), 201);
      // Average 10 x 4, weight 3 x 4, length 1 x 1.6; the weapon is made for big wielders
      expect(big.item).toMatchObject({ size: 'big', value: 40, info: { weight: 12, length: 1.6 }, weapon: { wielderSize: 'big' } });
      const clash = await as('owner').post('/v1/items/purchases', {
        buyer: faction(),
        itemTypeId: 'sword',
        size: 'big',
        wielderSize: 'small',
      });
      expect(clash.status).toBe(400);
      expect(clash.body).toMatchObject({ code: 'err-item-invalid-size' });

      const fine = ok(
        await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId: 'e2e-ring', jewelryClass: 'fine', value: 12 }),
        201,
      );
      expect(fine.item).toMatchObject({ jewelryClass: 'fine', value: 12 });
      // Without a value the server rolls it in the range of the type (10-20), quality class by default (x0.1)
      const rolled = ok(await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId: 'e2e-ring' }), 201);
      expect(rolled.item.jewelryClass).toBe('quality');
      expect(rolled.item.value).toBeGreaterThanOrEqual(1);
      expect(rolled.item.value).toBeLessThanOrEqual(2);

      const wrong = await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId: 'sword', carats: 2 });
      expect(wrong.status).toBe(400);
      expect(wrong.body).toMatchObject({ code: 'err-item-invalid-gem' });
    });

    it('quotes and buys an order with the instance fields of each line', async () => {
      const lines = [
        { itemTypeId: 'e2e-gem', amount: 1, carats: 3 },
        { itemTypeId: 'e2e-ring', amount: 1, jewelryClass: 'fine' },
        { itemTypeId: 'arrow', amount: 10, size: 'small' },
      ];
      const quote = ok(await as('owner').post('/v1/items/purchase-orders/quote', { lines }));
      // A jewel without a value is quoted at the middle of its range: 15 x 1 (fine)
      expect(quote.lines).toEqual([
        expect.objectContaining({ itemTypeId: 'e2e-gem', instance: { carats: 3 }, price: expect.objectContaining({ unitPrice: 6 }) }),
        expect.objectContaining({
          instance: { jewelryClass: 'fine', jewelryValue: 15 },
          price: expect.objectContaining({ unitPrice: 15 }),
        }),
        expect.objectContaining({ instance: { size: 'small' }, price: expect.objectContaining({ unitPrice: 0.025, total: 0.25 }) }),
      ]);
      const order = ok(await as('owner').post('/v1/items/purchase-orders', { buyer: faction(), lines }), 201);
      expect(order.items).toEqual([
        expect.objectContaining({ carats: 3, value: 6 }),
        expect.objectContaining({ jewelryClass: 'fine' }),
        expect.objectContaining({ size: 'small', amount: 10, value: 0.025 }),
      ]);
      const ring = order.items[1];
      expect(ring.value).toBeGreaterThanOrEqual(10);
      expect(ring.value).toBeLessThanOrEqual(20);

      const single = ok(
        await as('owner').post('/v1/items/price-quotes', { kind: 'purchase', itemTypeId: 'e2e-gem', carats: 4, cutFactor: 10 }),
      );
      expect(single.price).toMatchObject({ unitBase: 80, total: 80 });
    });

    it('sells gems and jewelry to a jeweler for their value less the commission', async () => {
      const gem = ok(await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId: 'e2e-gem', carats: 5 }), 201);
      const quote = ok(
        await as('owner').post('/v1/items/price-quotes', { kind: 'sale', itemId: gem.item.id, jeweler: true, jewelerPercent: 5 }),
      );
      expect(quote.price).toMatchObject({ unitBase: 10, jewelerPercent: 5, unitPrice: 9.5 });
      expect(quote.rules).toMatchObject({ jewelerPercent: 5 });
      const sold = ok(await as('owner').post(`/v1/items/${gem.item.id}/sale`, { jeweler: true }), 201);
      // RMU_STRATEGIC_JEWELER_PERCENT: 3
      expect(sold.entry).toMatchObject({ kind: 'sale', price: { jewelerPercent: 3, unitPrice: 9.7, total: 9.7 } });
      expect(sold.item).toBeNull();

      expect(ok(await as('owner').get('/v1/economy-rules'))).toMatchObject({ jewelerPercent: 3 });
      const rope = ok(await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId: 'rope' }), 201);
      const refused = await as('owner').post(`/v1/items/${rope.item.id}/sale`, { jeweler: true });
      expect(refused.status).toBe(400);
      expect(refused.body).toMatchObject({ code: 'err-item-not-jewel' });
    });

    it('keeps the instance fields in the export and the import', async () => {
      ok(await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId: 'e2e-gem', carats: 2.5 }), 201);
      ok(await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId: 'e2e-ring', jewelryClass: 'junk', value: 10 }), 201);
      const file = ok(await as('owner').get(`/v1/factions/${factionId}/export`));
      expect(file.formatVersion).toBe(14);
      expect(file.data.armory).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ itemTypeId: 'e2e-gem', carats: 2.5, value: 5 }),
          expect.objectContaining({ itemTypeId: 'e2e-ring', jewelryClass: 'junk', value: 0.01 }),
        ]),
      );
      const target = await createGame(e2e);
      const result = ok(await as('owner').importFile(`/v1/strategic-games/${target.id}/faction-imports`, file));
      const armory = ok(await as('owner').get(`/v1/items?q=factionId==${result.factionId}`)).content as Body[];
      expect(armory).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ itemTypeId: 'e2e-gem', carats: 2.5 }),
          expect.objectContaining({ itemTypeId: 'e2e-ring', jewelryClass: 'junk' }),
        ]),
      );
    });
  });

  describe('herbs in play', () => {
    it('heals with a dose of a herb, up to the maximum hits, and spends it', async () => {
      const leaf = await give('e2e-heal-leaf', 2);
      const max = await wound(10);
      const used = ok(await as('owner').post(`${base()}/herb-uses`, { itemId: leaf.id, roll: 4 }));
      expect(used).toMatchObject({ healed: 4, roll: 4, hp: { max, current: max - 6 }, item: { id: leaf.id, amount: 1 } });
      // The last dose: the roll is capped at the maximum and the item is gone
      const last = ok(await as('owner').post(`${base()}/herb-uses`, { itemId: leaf.id, roll: 8 }));
      expect(last).toMatchObject({ healed: 6, hp: { current: max }, item: null });
      expect((await as('owner').get(`/v1/items/${leaf.id}`)).status).toBe(404);
      const log = ok(await as('owner').get(`${base()}/healing-log`));
      expect(log.content).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'herb', summary: expect.objectContaining({ healed: 4 }) })]),
      );

      // A roll in the range of the herb when none is sent
      const another = await give('e2e-heal-leaf');
      await wound(19);
      const rolled = ok(await as('owner').post(`${base()}/herb-uses`, { itemId: another.id }));
      expect(rolled.healed).toBeGreaterThanOrEqual(3);
      expect(rolled.healed).toBeLessThanOrEqual(8);
    });

    it('refuses a herb without a heal effect, an item that is not a herb and a herb of another character', async () => {
      const moss = await give('e2e-bone-moss');
      const without = await as('owner').post(`${base()}/herb-uses`, { itemId: moss.id });
      expect(without.status).toBe(400);
      expect(without.body).toMatchObject({ code: 'herb-without-effect' });
      const rope = await give('rope');
      expect((await as('owner').post(`${base()}/herb-uses`, { itemId: rope.id })).body).toMatchObject({ code: 'err-item-not-herb' });
      const other = await createCharacter(e2e, gameId, factionId, 'owner', { name: 'Other' });
      const notHeld = await as('owner').post(`/v1/characters/${other.id}/herb-uses`, { itemId: moss.id });
      expect(notHeld.body).toMatchObject({ code: 'err-herb-not-held' });
      expect((await as('other').post(`${base()}/herb-uses`, { itemId: moss.id })).status).toBe(403);
    });

    it('treats an injury with a herb that treats it: +25 to Medicine, +50 to the recovery roll, one dose spent', async () => {
      const added = ok(
        await as('owner').post(`${base()}/injuries`, {
          type: 'bone',
          severity: 'medium',
          location: 'arm',
          penalty: -20,
          initialPenalty: -20,
        }),
      );
      const injury = added.injuries.slice(-1)[0] as Body;
      const moss = await give('e2e-bone-moss', 2);
      const healer = { name: 'Healer', bonus: 10 };
      const treated = ok(
        await as('owner').post(`${base()}/injuries/${injury.id}/treatments`, {
          procedure: 'splint',
          healer,
          roll: 50,
          herbItemId: moss.id,
        }),
      );
      const treatment = treated.injuries.find((one: Body) => one.id === injury.id).treatments[0];
      // 50 + 10 + 20 (splint of a medium bone injury: easy) + 25 (herb)
      expect(maneuverCalls.totals.slice(-1)[0]).toBe(105);
      expect(treatment).toMatchObject({
        total: 105,
        healingType: 'magic-or-herbs',
        herb: { itemId: moss.id, itemTypeId: 'e2e-bone-moss', magical: true, medicineBonus: 25, recoveryBonus: 50 },
      });
      expect(ok(await as('owner').get(`/v1/items/${moss.id}`)).amount).toBe(1);
      const recovery = ok(await as('owner').post(`${base()}/injuries/${injury.id}/recovery`, { roll: 20 }));
      const breakdown = recovery.injuries.find((one: Body) => one.id === injury.id).recovery.breakdown;
      expect(breakdown).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'herb', value: 50 })]));

      // A magical herb that does not treat the injury, and a mundane one (+25 only)
      const leaf = await give('e2e-heal-leaf');
      const notApplicable = await as('owner').post(`${base()}/injuries/${injury.id}/treatments`, {
        procedure: 'splint',
        healer,
        roll: 50,
        herbItemId: leaf.id,
      });
      expect(notApplicable.status).toBe(400);
      expect(notApplicable.body).toMatchObject({ code: 'herb-not-applicable' });
      const root = await give('e2e-plain-root');
      const mundane = ok(
        await as('owner').post(`${base()}/injuries/${injury.id}/treatments`, {
          procedure: 'splint',
          healer,
          roll: 50,
          herbItemId: root.id,
        }),
      );
      expect(mundane.injuries.find((one: Body) => one.id === injury.id).treatments[1].herb).toMatchObject({
        magical: false,
        medicineBonus: 25,
        recoveryBonus: 0,
      });
      // The generic herbs option without an item works as before
      ok(await as('owner').post(`${base()}/injuries/${injury.id}/treatments`, { procedure: 'herbs', healer, roll: 50 }));
    });

    it('searches for herbs: a maneuver per herb, doses of the found ones to the inventory', async () => {
      maneuverCalls.results = ['success', 'failure'];
      const search = ok(
        await as('owner').post(`${base()}/herb-searches`, {
          biome: 'F',
          herbItemTypeIds: ['e2e-heal-leaf', 'e2e-bone-moss', 'e2e-stun-berry'],
          skillId: 'survival',
          roll: 100,
          bonus: 20,
          modifiers: [{ key: 'herbalism', value: 10 }],
          previousSearches: 1,
          familiar: true,
        }),
      );
      // Base 130; three herbs: -6, -12 and -18; one previous search: -10
      expect(search).toMatchObject({ base: 130, bonus: 20, hours: 5 });
      const [leaf, moss, berry] = search.herbs as Body[];
      expect(leaf).toMatchObject({ itemTypeId: 'e2e-heal-leaf', difficulty: 'm', total: 114, result: 'found', maneuverResult: 'success' });
      expect(leaf.doses).toBe(leaf.d10 + 1);
      expect(moss).toMatchObject({ total: 98, result: 'not-found', doses: 0, itemIds: [] });
      expect(moss.modifiers).toEqual([
        { key: 'difficulty', value: -10 },
        { key: 'previous-searches', value: -10 },
        { key: 'several-herbs', value: -12 },
      ]);
      expect(berry).toMatchObject({ result: 'not-here', doses: 0 });
      expect(maneuverCalls.tables).toEqual(['generic', 'generic']);
      expect(search.items).toEqual([
        expect.objectContaining({ id: leaf.itemIds[0], itemTypeId: 'e2e-heal-leaf', amount: leaf.doses, acquiredPrice: 0, characterId }),
      ]);
      const ledger = ok(await as('owner').get(`/v1/item-ledger?q=itemId==${leaf.itemIds[0]}`));
      expect(ledger.content).toEqual([expect.objectContaining({ kind: 'found', amount: leaf.doses, note: 'herb-search' })]);
    });

    it('refuses a search without a skill bonus, with an item type that is not a herb or by another user', async () => {
      const body = { biome: 'F', herbItemTypeIds: ['e2e-heal-leaf'], skillId: 'survival', roll: 50 };
      expect((await as('owner').post(`${base()}/herb-searches`, body)).body).toMatchObject({ code: 'err-item-skill-required' });
      expect((await as('owner').post(`${base()}/herb-searches`, { ...body, bonus: 10, herbItemTypeIds: ['rope'] })).body).toMatchObject({
        code: 'err-item-not-herb',
      });
      expect((await as('owner').post(`${base()}/herb-searches`, { ...body, biome: 'Q' })).status).toBe(400);
      expect((await as('other').post(`${base()}/herb-searches`, { ...body, bonus: 10 })).status).toBe(403);
    });
  });
});
