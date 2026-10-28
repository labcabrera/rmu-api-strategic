import { DeleteFactionsByGameCommand } from '../../../../src/modules/factions/application/cqrs/commands/delete-factions-by-game.command.js';
import { DeleteFactionsByGameHandler } from '../../../../src/modules/factions/application/cqrs/handlers/delete-factions-by-game.handler.js';
import type { FactionRepository } from '../../../../src/modules/factions/application/ports/faction-repository.port.js';
import type { Faction } from '../../../../src/modules/factions/domain/aggregates/faction.js';
import { fakeEventPublisher } from '../../support/fake-event-publisher.js';

const faction = (id: string, gameId: string) => ({ id, gameId, getProps: () => ({ id, gameId }) }) as unknown as Faction;

const setup = (factions: Faction[]) => {
  const stored = new Map(factions.map(f => [f.id, f]));
  const deleteById = vi.fn((id: string) => {
    stored.delete(id);
    return Promise.resolve();
  });
  const repository = {
    findByGameId: vi.fn((gameId: string) => Promise.resolve([...stored.values()].filter(f => f.gameId === gameId))),
    deleteById,
  } as unknown as FactionRepository;
  const events = fakeEventPublisher();
  return { handler: new DeleteFactionsByGameHandler(repository, events.publisher), stored, deleteById, events };
};

describe('DeleteFactionsByGameHandler', () => {
  it('deletes only the factions of the game and publishes a faction.deleted per faction', async () => {
    const { handler, stored, events } = setup([faction('f1', 'g1'), faction('f2', 'g2'), faction('f3', 'g1')]);

    await handler.execute(new DeleteFactionsByGameCommand('g1'));

    expect([...stored.keys()]).toEqual(['f2']);
    expect(events.published.map(p => [p.aggregateType, p.event.eventType])).toEqual([
      ['faction', 'deleted'],
      ['faction', 'deleted'],
    ]);
  });

  it('does nothing when the message is repeated', async () => {
    const { handler, deleteById, events } = setup([faction('f1', 'g1')]);
    await handler.execute(new DeleteFactionsByGameCommand('g1'));

    await handler.execute(new DeleteFactionsByGameCommand('g1'));

    expect(deleteById).toHaveBeenCalledTimes(1);
    expect(events.published).toHaveLength(1);
  });
});
