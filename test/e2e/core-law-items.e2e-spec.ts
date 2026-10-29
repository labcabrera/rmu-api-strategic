/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- HTTP bodies read as loose JSON */
import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createFaction, createGame } from './support/builders.js';

type Body = Record<string, any>;

/** Workspace spec 041: N items of a type that does not stack, full suits, armor classes and improvised weapons. */
describe('core law items (e2e)', () => {
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
    factionId = (await createFaction(e2e, gameId, 'owner', { name: 'Realm', management: { availableGold: 100 } })).id;
    characterId = (await createCharacter(e2e, gameId, factionId, 'owner', { name: 'Knight' })).id;
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', e2e.auth(user)),
  });
  const faction = () => ({ kind: 'faction', id: factionId });
  const gold = async () => ((await as('owner').get(`/v1/factions/${factionId}`)).body as Body).management.availableGold as number;
  const buy = async (itemTypeId: string, amount = 1, buyer: object = faction()) => {
    const response = await as('owner').post('/v1/items/purchases', { buyer, itemTypeId, amount });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body as Body;
  };
  const equip = (itemId: string, slot: string) => as('owner').post(`/v1/characters/${characterId}/equipment`, { itemId, slot });
  const character = async () => (await as('owner').get(`/v1/characters/${characterId}`)).body as Body;

  it('buys N items of a type that does not stack as N items, with one charge and one ledger entry', async () => {
    const { item, items, entry } = await buy('longsword', 3);
    expect(items).toHaveLength(3);
    expect(item.id).toBe(items[0].id);
    expect(new Set(items.map((one: Body) => one.id)).size).toBe(3);
    items.forEach((one: Body) => expect(one).toMatchObject({ amount: null, acquiredPrice: 10, factionId }));
    expect(entry).toMatchObject({ kind: 'purchase', amount: 3, itemId: items[0].id, payments: [{ gold: -30 }], price: { total: 30 } });
    expect(entry.itemIds).toEqual(items.map((one: Body) => one.id));
    expect(await gold()).toBe(70);
    // The history of each item shows the purchase
    const ledger = await as('owner').get(`/v1/item-ledger?q=itemIds==${items[2].id}`);
    expect(ledger.status, JSON.stringify(ledger.body)).toBe(200);
    expect((ledger.body as Body).content.map((one: Body) => one.id)).toEqual([entry.id]);
  });

  it('keeps one stack for a stackable type and fills itemIds with it', async () => {
    const { item, items, entry } = await buy('arrow', 20);
    expect(items).toBeUndefined();
    expect(item.amount).toBe(20);
    expect(entry.itemIds).toEqual([item.id]);
  });

  it('rejects part of a unit or too many items of a type that does not stack, without charging anything', async () => {
    for (const amount of [2.5, 101]) {
      const response = await as('owner').post('/v1/items/purchases', { buyer: faction(), itemTypeId: 'longsword', amount });
      expect(response.status, String(amount)).toBe(400);
      expect(response.body).toMatchObject({ code: 'err-item-invalid-amount' });
    }
    expect(await gold()).toBe(100);
  });

  it('copies the lot size and the blocks of the type to the item', async () => {
    const { item } = await buy('e2e-lantern');
    expect(item.catalog).toMatchObject({ lotSize: 2, features: { light: { radius: 20, durationHours: 5 } } });
  });

  it('fills the four slots with a full suit, counts it once and empties them all when it is unequipped', async () => {
    const holder = { kind: 'character', id: characterId };
    await as('owner').post(`/v1/characters/${characterId}/transfer-faction-gold`, { amount: 50 });
    const suit = (await buy('e2e-suit', 1, holder)).item as Body;
    const equipped = await equip(suit.id, 'body');
    expect(equipped.status, JSON.stringify(equipped.body)).toBe(201);
    const slots = (equipped.body as Body).equipment.slots;
    expect([slots.body, slots.head, slots.arms, slots.legs]).toEqual([suit.id, suit.id, suit.id, suit.id]);
    const sheet = await character();
    expect(sheet.defense.armor.at).toBe(8);
    expect(sheet.equipment.baseManeuverPenalty).toBe(-60);
    expect((await as('owner').delete(`/v1/characters/${characterId}/equipment/${suit.id}`)).status).toBe(200);
    const after = (await character()).equipment.slots;
    expect([after.body, after.head, after.arms, after.legs]).toEqual([null, null, null, null]);
  });

  it('takes the whole suit off when a piece goes into one of its slots', async () => {
    const holder = { kind: 'character', id: characterId };
    await as('owner').post(`/v1/characters/${characterId}/transfer-faction-gold`, { amount: 50 });
    const suit = (await buy('e2e-suit', 1, holder)).item as Body;
    const helmet = (await buy('e2e-heavy-helmet', 1, holder)).item as Body;
    await equip(suit.id, 'body');
    const slots = ((await equip(helmet.id, 'head')).body as Body).equipment.slots;
    expect([slots.body, slots.head, slots.arms, slots.legs]).toEqual([null, helmet.id, null, null]);
  });

  it('gives a heavy helmet the torso AT when it suits it, and AT 9 otherwise', async () => {
    const holder = { kind: 'character', id: characterId };
    await as('owner').post(`/v1/characters/${characterId}/transfer-faction-gold`, { amount: 50 });
    const helmet = (await buy('e2e-heavy-helmet', 1, holder)).item as Body;
    const greaves = (await buy('e2e-light-greaves', 1, holder)).item as Body;
    const plate = (await buy('e2e-plate-torso', 1, holder)).item as Body;
    const leather = (await buy('e2e-leather-torso', 1, holder)).item as Body;
    await equip(helmet.id, 'head');
    await equip(greaves.id, 'legs');
    await equip(plate.id, 'body');
    let armor = (await character()).defense.armor;
    expect(armor).toMatchObject({ bodyAt: 10, headAt: 10, legsAt: 3 });
    await equip(leather.id, 'body');
    armor = (await character()).defense.armor;
    expect(armor).toMatchObject({ bodyAt: 3, headAt: 9, legsAt: 3 });
  });

  it('attacks with a tool as an improvised weapon, with the OB modifier of its mode', async () => {
    const holder = { kind: 'character', id: characterId };
    await as('owner').post(`/v1/characters/${characterId}/transfer-faction-gold`, { amount: 5 });
    const chisel = (await buy('e2e-chisel', 1, holder)).item as Body;
    const equipped = await equip(chisel.id, 'mainHand');
    expect(equipped.status, JSON.stringify(equipped.body)).toBe(201);
    const attack = ((await character()).attacks as Body[]).find(one => one.itemId === chisel.id)!;
    expect(attack.boModifiers.improvised).toBe(-40);
    expect(attack.weaponTags).toEqual(['improvised']);
  });

  it('rejects an item without weapon data in the off hand', async () => {
    const holder = { kind: 'character', id: characterId };
    await as('owner').post(`/v1/characters/${characterId}/transfer-faction-gold`, { amount: 5 });
    const lantern = (await buy('e2e-lantern', 1, holder)).item as Body;
    const response = await equip(lantern.id, 'offHand');
    expect(response.status).toBe(400);
  });
});
