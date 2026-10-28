import { DeleteGamesByRealmCommand } from '../../../../src/modules/games/application/cqrs/commands/delete-games-by-realm.command.js';
import { DeleteGamesByRealmHandler } from '../../../../src/modules/games/application/cqrs/handlers/delete-games-by-realm.handler.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import type { Game } from '../../../../src/modules/games/domain/aggregates/game.js';
import { fakeEventPublisher } from '../../support/fake-event-publisher.js';

const game = (id: string, realmId: string) => ({ id, realmId }) as Game;

/** An in-memory repository: findByRealm filters by realmId, deleteById removes the game. */
const setup = (games: Game[]) => {
  const stored = new Map(games.map(g => [g.id, g]));
  const deleteById = vi.fn((id: string) => {
    stored.delete(id);
    return Promise.resolve();
  });
  const repository = {
    findByRealm: vi.fn((realmId: string) => Promise.resolve([...stored.values()].filter(g => g.realmId === realmId))),
    deleteById,
  } as unknown as GameRepository;
  const events = fakeEventPublisher();
  return { handler: new DeleteGamesByRealmHandler(repository, events.publisher), stored, deleteById, events };
};

describe('DeleteGamesByRealmHandler', () => {
  it('deletes only the games of the realm and publishes a game.deleted per game', async () => {
    const { handler, stored, events } = setup([game('g1', 'realm-a'), game('g2', 'realm-b'), game('g3', 'realm-a')]);

    await handler.execute(new DeleteGamesByRealmCommand('realm-a'));

    expect([...stored.keys()]).toEqual(['g2']);
    expect(events.published.map(p => [p.aggregateType, p.event.eventType, (p.event.data as Game).id])).toEqual([
      ['game', 'deleted', 'g1'],
      ['game', 'deleted', 'g3'],
    ]);
  });

  it('deletes one game at a time', async () => {
    const { handler, deleteById, events } = setup([game('g1', 'realm-a'), game('g2', 'realm-a')]);
    const order: string[] = [];
    deleteById.mockImplementation((id: string) => {
      order.push(`delete ${id}`);
      return Promise.resolve();
    });
    events.publish.mockImplementation((_type: string, ...published) => {
      published.forEach(e => order.push(`publish ${(e.data as Game).id}`));
      return Promise.resolve();
    });

    await handler.execute(new DeleteGamesByRealmCommand('realm-a'));

    expect(order).toEqual(['delete g1', 'publish g1', 'delete g2', 'publish g2']);
  });

  it('does nothing when the message is repeated', async () => {
    const { handler, deleteById, events } = setup([game('g1', 'realm-a')]);
    await handler.execute(new DeleteGamesByRealmCommand('realm-a'));

    await handler.execute(new DeleteGamesByRealmCommand('realm-a'));

    expect(deleteById).toHaveBeenCalledTimes(1);
    expect(events.published).toHaveLength(1);
  });
});
