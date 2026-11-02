import { DeleteItemsByGameCommand } from '../../../../src/modules/items/application/cqrs/commands/delete-items-by-game.command.js';
import { DeleteItemsByGameHandler } from '../../../../src/modules/items/application/cqrs/handlers/delete-items-by-game.handler.js';
import type { ItemRepository } from '../../../../src/modules/items/application/ports/item-repository.port.js';
import type { Item } from '../../../../src/modules/items/domain/aggregates/item.js';
import type { ItemProps } from '../../../../src/modules/items/domain/aggregates/item-props.js';
import { fakeEventPublisher } from '../../support/fake-event-publisher.js';

const item = (id: string, gameId: string) => ({ id, gameId, getProps: () => ({ id, gameId }) }) as unknown as Item;

const setup = (items: Item[]) => {
  const stored = new Map(items.map(i => [i.id, i]));
  const deleteById = vi.fn((id: string) => {
    stored.delete(id);
    return Promise.resolve();
  });
  const repository = {
    findByGameId: vi.fn((gameId: string) => Promise.resolve([...stored.values()].filter(i => i.gameId === gameId))),
    deleteById,
  } as unknown as ItemRepository;
  const events = fakeEventPublisher();
  return { handler: new DeleteItemsByGameHandler(repository, events.publisher), stored, deleteById, events };
};

describe('DeleteItemsByGameHandler', () => {
  it('deletes only the items of the game and publishes an item.deleted per item', async () => {
    const { handler, stored, events } = setup([item('i1', 'g1'), item('i2', 'g2'), item('i3', 'g1')]);

    await handler.execute(new DeleteItemsByGameCommand('g1'));

    expect([...stored.keys()]).toEqual(['i2']);
    expect(events.published.map(p => [p.aggregateType, p.event.eventType, (p.event.data as ItemProps).id])).toEqual([
      ['item', 'deleted', 'i1'],
      ['item', 'deleted', 'i3'],
    ]);
  });

  it('does nothing when the message is repeated', async () => {
    const { handler, deleteById, events } = setup([item('i1', 'g1')]);
    await handler.execute(new DeleteItemsByGameCommand('g1'));

    await handler.execute(new DeleteItemsByGameCommand('g1'));

    expect(deleteById).toHaveBeenCalledTimes(1);
    expect(events.published).toHaveLength(1);
  });
});
