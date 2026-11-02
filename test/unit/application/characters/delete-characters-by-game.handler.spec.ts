import { DeleteCharactersByGameCommand } from '../../../../src/modules/characters/application/cqrs/commands/delete-characters-by-game.command.js';
import { DeleteCharactersByGameHandler } from '../../../../src/modules/characters/application/cqrs/handlers/delete-characters-by-game.handler.js';
import type { CharacterRepository } from '../../../../src/modules/characters/application/ports/character-repository.port.js';
import type { HealingLogRepository } from '../../../../src/modules/characters/application/ports/healing-log-repository.port.js';
import type { Character } from '../../../../src/modules/characters/domain/aggregates/character.js';
import { fakeEventPublisher } from '../../support/fake-event-publisher.js';

const character = (id: string, gameId: string) => ({ id, gameId, getProps: () => ({ id, gameId }) }) as unknown as Character;

const setup = (characters: Character[]) => {
  const stored = new Map(characters.map(c => [c.id, c]));
  const deleteById = vi.fn((id: string) => {
    stored.delete(id);
    return Promise.resolve();
  });
  const repository = {
    findByGameId: vi.fn((gameId: string) => Promise.resolve([...stored.values()].filter(c => c.gameId === gameId))),
    deleteById,
  } as unknown as CharacterRepository;
  const healingLog = { deleteByCharacterId: vi.fn(() => Promise.resolve()) };
  const events = fakeEventPublisher();
  const handler = new DeleteCharactersByGameHandler(repository, healingLog as unknown as HealingLogRepository, events.publisher);
  return { handler, stored, deleteById, healingLog, events };
};

describe('DeleteCharactersByGameHandler', () => {
  it('deletes only the characters of the game with their healing log and publishes a character.deleted each', async () => {
    const { handler, stored, healingLog, events } = setup([character('c1', 'g1'), character('c2', 'g2'), character('c3', 'g1')]);

    await handler.execute(new DeleteCharactersByGameCommand('g1'));

    expect([...stored.keys()]).toEqual(['c2']);
    expect(healingLog.deleteByCharacterId.mock.calls).toEqual([['c1'], ['c3']]);
    expect(events.published.map(p => [p.aggregateType, p.event.eventType, (p.event.data as { id: string }).id])).toEqual([
      ['character', 'deleted', 'c1'],
      ['character', 'deleted', 'c3'],
    ]);
  });

  it('does nothing when the message is repeated', async () => {
    const { handler, deleteById, events } = setup([character('c1', 'g1')]);
    await handler.execute(new DeleteCharactersByGameCommand('g1'));

    await handler.execute(new DeleteCharactersByGameCommand('g1'));

    expect(deleteById).toHaveBeenCalledTimes(1);
    expect(events.published).toHaveLength(1);
  });
});
