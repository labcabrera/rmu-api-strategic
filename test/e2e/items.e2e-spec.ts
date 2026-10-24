import type { KafkaContext } from '@nestjs/microservices';
import request from 'supertest';
import type { CharacterDeletedEvent } from '../../src/modules/characters/domain/events/character.events.js';
import { KafkaItemCharacterEventConsumer } from '../../src/modules/items/interfaces/messaging/kafka.character-event-consumer.js';
import { ids, startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createFaction, createItem, gameWithFaction } from './support/builders.js';

describe('items (e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;
  let factionId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    const { game } = await gameWithFaction(e2e);
    gameId = game.id;
    factionId = (await createFaction(e2e, gameId, 'owner', { name: 'Rich', management: { availableGold: 10, availableXP: 0 } })).id;
    e2e.events.clear();
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', e2e.auth(user)),
  });

  it('rejects requests without a token', async () => {
    expect((await request(e2e.server).get('/v1/items')).status).toBe(401);
    expect((await request(e2e.server).post('/v1/items').send({ gameId, factionId, itemTypeId: 'stone' })).status).toBe(401);
  });

  describe('create', () => {
    it('creates an item of a faction from the item type and charges its cost to the faction', async () => {
      const response = await as('owner').post('/v1/items', { gameId, factionId, itemTypeId: 'rope' });
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ gameId, factionId, itemTypeId: 'rope', name: 'rope', category: 'equipment', carried: false });
      expect((await as('owner').get(`/v1/factions/${factionId}`)).body).toMatchObject({ management: { availableGold: 8 } });
      // F-strategic-09: the gold charged to the faction and the new item
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.faction.updated.v1', 'internal.rmu-strategic.item.created.v1']);
      expect(e2e.events.published[1].event).toMatchObject({ data: { id: (response.body as { id: string }).id, itemTypeId: 'rope' } });
    });

    it('publishes item.updated when a stackable item of the character grows, and charges the gold of the character first', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      await createItem(e2e, { gameId, characterId: character.id, itemTypeId: 'gold-coin', amount: 1 });
      e2e.events.clear();
      const more = await as('owner').post('/v1/items', { gameId, characterId: character.id, itemTypeId: 'gold-coin', amount: 2 });
      expect(more.status).toBe(201);
      expect(more.body).toMatchObject({ amount: 3 });
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.item.updated.v1']);
    });

    it('rejects an item the faction cannot afford, an unknown item type and an invalid body with 400', async () => {
      const poor = (await createFaction(e2e, gameId)).id;
      const expensive = await as('owner').post('/v1/items', { gameId, factionId: poor, itemTypeId: 'rope' });
      expect(expensive.status).toBe(400);
      // F-strategic-19: an unknown item type is a 400, not the 404 of the items API
      const unknown = await as('owner').post('/v1/items', { gameId, factionId, itemTypeId: 'unknown' });
      expect(unknown.status).toBe(400);
      expect(unknown.body).toMatchObject({ code: 'validation', message: 'Invalid item type unknown' });
      expect((await as('owner').post('/v1/items', { gameId, itemTypeId: 'stone' })).status).toBe(400);
      const character = await createCharacter(e2e, gameId, factionId);
      expect((await as('owner').post('/v1/items', { gameId, factionId, characterId: character.id, itemTypeId: 'stone' })).status).toBe(400);
      expect((await as('owner').post('/v1/items', { factionId })).status).toBe(400);
    });

    it('rejects a token without groups with 403', async () => {
      expect((await as('noRole').post('/v1/items', { gameId, factionId, itemTypeId: 'stone' })).status).toBe(403);
      expect((await as('admin').post('/v1/items', { gameId, factionId, itemTypeId: 'stone' })).status).toBe(201);
    });
  });

  describe('read', () => {
    it('reads by id as its game, and answers 404 for an unknown item', async () => {
      const item = await createItem(e2e, { gameId, factionId });
      expect((await as('owner').get(`/v1/items/${item.id}`)).body).toMatchObject({ id: item.id, itemTypeId: 'stone' });
      expect((await as('admin').get(`/v1/items/${item.id}`)).status).toBe(200);
      expect((await as('service').get(`/v1/items/${item.id}`)).status).toBe(200);
      // The game is private: the item of one of its factions is not readable by another user (spec 021)
      expect((await as('other').get(`/v1/items/${item.id}`)).status).toBe(403);
      expect((await as('noRole').get(`/v1/items/${item.id}`)).status).toBe(403);
      expect((await as('owner').get('/v1/items/item-missing')).status).toBe(404);
    });

    it('lets a player read the items of their character in the private game of another user', async () => {
      const character = await createCharacter(e2e, gameId, factionId, 'other');
      const item = await createItem(e2e, { gameId, characterId: character.id }, 'other');
      expect((await as('other').get(`/v1/items/${item.id}`)).status).toBe(200);
      expect(ids((await as('other').get(`/v1/items?q=characterId==${character.id}`)).body)).toEqual([item.id]);
      expect(ids((await as('other').get('/v1/items')).body)).toEqual([item.id]);
      expect(ids((await as('noRole').get('/v1/items')).body)).toEqual([]);
    });

    it('filters with RSQL and pages, accepting the size=1000 of rmu-api-tactical', async () => {
      for (const name of ['Alpha', 'Beta', 'Gamma']) await createItem(e2e, { gameId, factionId, name });
      const filtered = await as('owner').get(`/v1/items?q=factionId==${factionId};name==Beta`);
      expect((filtered.body as { content: { name: string }[] }).content.map(i => i.name)).toEqual(['Beta']);
      const page = await as('owner').get('/v1/items?page=1&size=2');
      expect(page.body).toMatchObject({ pagination: { page: 1, size: 2, totalElements: 3, totalPages: 2 } });
      const tactical = await as('owner').get(`/v1/items?q=factionId==${factionId}&page=0&size=1000`);
      expect(tactical.status).toBe(200);
      expect(ids(tactical.body)).toHaveLength(3);
      // The items of a private game are not listed to another user
      expect(ids((await as('other').get(`/v1/items?q=factionId==${factionId}`)).body)).toEqual([]);
      expect((await as('owner').get('/v1/items?size=1001')).status).toBe(400);
      expect((await as('owner').get('/v1/items?q=name=x')).status).toBe(400);
    });
  });

  describe('update', () => {
    it('lets the owner and an admin change the item', async () => {
      const item = await createItem(e2e, { gameId, factionId });
      const response = await as('owner').patch(`/v1/items/${item.id}`, { name: 'Renamed' });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: item.id, name: 'Renamed' });
      expect((await as('admin').patch(`/v1/items/${item.id}`, { name: 'By admin' })).status).toBe(200);
      expect((await as('owner').patch('/v1/items/item-missing', { name: 'x' })).status).toBe(404);
    });

    it('rejects a PATCH with a stale version with 409, also after a write of the character on the item', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      const item = await createItem(e2e, { gameId, characterId: character.id });
      expect(item.version).toBe(0);
      // Carrying the item writes it: the version read before is stale
      await request(e2e.server).put(`/v1/characters/${character.id}/items/${item.id}/carried/true`).set('Authorization', e2e.auth('owner'));
      const stale = await as('owner').patch(`/v1/items/${item.id}`, { name: 'Stale', version: 0 });
      expect(stale.status).toBe(409);
      expect(stale.body).toMatchObject({ code: 'version-conflict' });
      expect((await as('owner').patch(`/v1/items/${item.id}`, { name: 'Fresh', version: 1 })).body).toMatchObject({
        name: 'Fresh',
        version: 2,
      });
    });

    it('rejects a change by another user or a token without groups with 403', async () => {
      const item = await createItem(e2e, { gameId, factionId });
      expect((await as('other').patch(`/v1/items/${item.id}`, { name: 'Hijacked' })).status).toBe(403);
      expect((await as('noRole').patch(`/v1/items/${item.id}`, { name: 'Hijacked' })).status).toBe(403);
    });
  });

  describe('modifiers', () => {
    it('adds and removes a modifier, publishing item.updated, with the permissions of an update', async () => {
      const item = await createItem(e2e, { gameId, factionId });
      e2e.events.clear();
      const modifier = { type: 'breakage', value: -20, appliesTo: 'all', description: 'Dented' };
      expect((await as('other').post(`/v1/items/${item.id}/modifiers`, modifier)).status).toBe(403);
      expect((await as('owner').post(`/v1/items/${item.id}/modifiers`, { ...modifier, type: 'unknown' })).status).toBe(400);
      const added = await as('owner').post(`/v1/items/${item.id}/modifiers`, modifier);
      expect(added.status).toBe(201);
      const body = added.body as { modifiers: { id: string; type: string; value: number }[] };
      expect(body.modifiers).toHaveLength(1);
      expect(body.modifiers[0]).toMatchObject({ type: 'breakage', value: -20, appliesTo: 'all', source: { kind: 'manual' } });
      const modifierId = body.modifiers[0].id;
      expect((await as('other').delete(`/v1/items/${item.id}/modifiers/${modifierId}`)).status).toBe(403);
      const removed = await as('owner').delete(`/v1/items/${item.id}/modifiers/${modifierId}`);
      expect(removed.status).toBe(200);
      expect((removed.body as { modifiers: unknown[] }).modifiers).toEqual([]);
      expect((await as('owner').delete(`/v1/items/${item.id}/modifiers/${modifierId}`)).status).toBe(404);
      expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.item.updated.v1', 'internal.rmu-strategic.item.updated.v1']);
    });
  });

  describe('delete', () => {
    it('deletes the item', async () => {
      const item = await createItem(e2e, { gameId, factionId });
      expect((await as('other').delete(`/v1/items/${item.id}`)).status).toBe(403);
      expect((await as('noRole').delete(`/v1/items/${item.id}`)).status).toBe(403);
      expect((await as('owner').delete(`/v1/items/${item.id}`)).status).toBe(204);
      expect((await as('owner').get(`/v1/items/${item.id}`)).status).toBe(404);
      expect((await as('owner').delete(`/v1/items/${item.id}`)).status).toBe(404);
    });

    it('unequips an equipped item of a character when it is deleted [F-strategic-04]', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      const item = await createItem(e2e, { gameId, characterId: character.id });
      const equipped = await as('owner').post(`/v1/characters/${character.id}/equipment`, { itemId: item.id, slot: 'mainHand' });
      expect((equipped.body as { equipment: { slots: Record<string, unknown> } }).equipment.slots.mainHand).toBe(item.id);
      expect((await as('owner').delete(`/v1/items/${item.id}`)).status).toBe(204);
      const after = (await as('owner').get(`/v1/characters/${character.id}`)).body as { equipment: { slots: Record<string, unknown> } };
      expect(after.equipment.slots.mainHand).toBeNull();
      expect(e2e.events.topics()).toContain('internal.rmu-strategic.character.updated.v1');
    });

    it('deletes the items of a deleted character, one at a time, although the character is gone [F-strategic-22, F-strategic-23]', async () => {
      const character = await createCharacter(e2e, gameId, factionId);
      const first = await createItem(e2e, { gameId, characterId: character.id });
      const second = await createItem(e2e, { gameId, characterId: character.id, itemTypeId: 'rope' });
      await as('owner').post(`/v1/characters/${character.id}/equipment`, { itemId: first.id, slot: 'mainHand' });
      expect((await as('owner').delete(`/v1/characters/${character.id}`)).status).toBe(204);
      // What Kafka delivers to the consumer of character.deleted
      const deleted = e2e.events.published.find(entry => entry.topic === 'internal.rmu-strategic.character.deleted.v1')!;
      const consumer = e2e.app.get(KafkaItemCharacterEventConsumer);
      const context = { getTopic: () => deleted.topic } as unknown as KafkaContext;
      await consumer.onCharacterDeleted(deleted.event as CharacterDeletedEvent, context);
      for (const item of [first, second]) expect((await as('owner').get(`/v1/items/${item.id}`)).status).toBe(404);
    });
  });
});
