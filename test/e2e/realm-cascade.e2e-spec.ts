import type { KafkaContext } from '@nestjs/microservices';
import request from 'supertest';
import { KafkaRealmEventConsumer } from '../../src/modules/games/interfaces/messaging/kafka.realm-event-consumer.js';
import { KafkaItemGameEventConsumer } from '../../src/modules/items/interfaces/messaging/kafka.game-event-consumer.js';
import { KafkaCharacterGameEventConsumer } from '../../src/modules/characters/interfaces/messaging/kafka.game-event-consumer.js';
import { KafkaFactionGameEventConsumer } from '../../src/modules/factions/interfaces/messaging/kafka.game-event-consumer.js';
import { ids, startApp, type E2eApp } from './support/app.js';
import { createCharacter, createGame, createItem, gameWithFaction } from './support/builders.js';

const context = (topic: string) => ({ getTopic: () => topic }) as unknown as KafkaContext;

/** Deleting a realm deletes its games and their items, characters and factions (spec 016 §1, F-strategic-02/-10/-24, spec 044). */
describe('realm cascade (e2e)', () => {
  let e2e: E2eApp;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
  });

  /** Delivers the realm.deleted message, then the game.deleted messages it published, as Kafka would. */
  const deleteRealm = async (realmId: string) => {
    await e2e.app.get(KafkaRealmEventConsumer).handleRealmDeleted({ data: { id: realmId } }, context('internal.rmu-core.realm.deleted.v1'));
    const gameDeleted = e2e.events.published.filter(p => p.topic === 'internal.rmu-strategic.game.deleted.v1');
    for (const { event } of gameDeleted) {
      for (const consumer of [KafkaItemGameEventConsumer, KafkaCharacterGameEventConsumer, KafkaFactionGameEventConsumer]) {
        await e2e.app
          .get(consumer)
          .onGameDeleted(event as unknown as { data: { id: string } }, context('internal.rmu-strategic.game.deleted.v1'));
      }
    }
  };

  it('deletes the games of the realm with their items, characters and factions, and keeps the rest', async () => {
    const { game, faction } = await gameWithFaction(e2e);
    const item = await createItem(e2e, { gameId: game.id, factionId: faction.id });
    const character = await createCharacter(e2e, game.id, faction.id);
    const { game: other, faction: otherFaction } = await gameWithFaction(e2e);
    const otherItem = await createItem(e2e, { gameId: other.id, factionId: otherFaction.id });
    const otherCharacter = await createCharacter(e2e, other.id, otherFaction.id);
    // A game of another realm (the realm fake knows a single one)
    await e2e.connection.collection('strategic-games').updateOne({ _id: other.id } as never, { $set: { realmId: 'realm-002' } });
    e2e.events.clear();

    await deleteRealm('realm-001');

    const games = await request(e2e.server).get('/v1/strategic-games').set('Authorization', e2e.auth('admin'));
    expect(ids(games.body)).toEqual([other.id]);
    expect((await request(e2e.server).get(`/v1/items/${item.id}`).set('Authorization', e2e.auth('admin'))).status).toBe(404);
    expect((await request(e2e.server).get(`/v1/items/${otherItem.id}`).set('Authorization', e2e.auth('admin'))).status).toBe(200);
    const status = async (path: string) => (await request(e2e.server).get(path).set('Authorization', e2e.auth('admin'))).status;
    expect(await status(`/v1/characters/${character.id}`)).toBe(404);
    expect(await status(`/v1/factions/${faction.id}`)).toBe(404);
    expect(await status(`/v1/characters/${otherCharacter.id}`)).toBe(200);
    expect(await status(`/v1/factions/${otherFaction.id}`)).toBe(200);
    expect(e2e.events.topics()).toEqual([
      'internal.rmu-strategic.game.deleted.v1',
      'internal.rmu-strategic.item.deleted.v1',
      'internal.rmu-strategic.character.deleted.v1',
      'internal.rmu-strategic.faction.deleted.v1',
    ]);
  });

  it('does nothing when realm.deleted is repeated', async () => {
    await createGame(e2e);
    await deleteRealm('realm-001');
    e2e.events.clear();

    await deleteRealm('realm-001');

    expect(e2e.events.published).toEqual([]);
  });
});
