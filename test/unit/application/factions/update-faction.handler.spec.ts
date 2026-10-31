import { UpdateFactionCommand } from '../../../../src/modules/factions/application/cqrs/commands/update-faction.command.js';
import { UpdateFactionHandler } from '../../../../src/modules/factions/application/cqrs/handlers/update-faction.handler.js';
import type { FactionRepository } from '../../../../src/modules/factions/application/ports/faction-repository.port.js';
import type { FactionNpcsResolver } from '../../../../src/modules/factions/application/services/faction-npcs.resolver.js';
import { Faction } from '../../../../src/modules/factions/domain/aggregates/faction.js';
import { FactionManagement } from '../../../../src/modules/factions/domain/value-objects/faction-management.vo.js';
import type { GameAccess } from '../../../../src/modules/games/application/services/game-access.service.js';
import type { Game } from '../../../../src/modules/games/domain/aggregates/game.js';
import { NotFoundError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { fakeEventPublisher } from '../../support/fake-event-publisher.js';

const stored = () =>
  Faction.fromProps({
    id: 'faction-1',
    gameId: 'game-1',
    name: 'Riders',
    management: new FactionManagement(0),
    shortDescription: undefined,
    description: undefined,
    imageUrl: undefined,
    owner: 'player-1',
    npcs: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: undefined,
  }).restoreVersion(0);

const setup = (game: Partial<Game> | null = { id: 'game-1', realmId: 'realm-1' }) => {
  const faction = stored();
  const update = vi.fn((entity: Faction) => Promise.resolve(entity));
  const repository = { findById: vi.fn(() => Promise.resolve(faction)), update } as unknown as FactionRepository;
  const gameAccess = { findGame: () => Promise.resolve(game), checkManage: () => undefined } as unknown as GameAccess;
  const resolve = vi.fn((entries: { npcId: string; count: number }[]) =>
    Promise.resolve(entries.map((entry, i) => ({ id: `entry-${i}`, npcId: entry.npcId, name: 'Wolf', count: entry.count, notes: null }))),
  );
  const resolver = { resolve } as unknown as FactionNpcsResolver;
  const events = fakeEventPublisher();
  return { handler: new UpdateFactionHandler(repository, events.publisher, gameAccess, resolver), resolve, update, events };
};

const command = (npcs?: { npcId: string; count: number }[]) =>
  new UpdateFactionCommand(
    'faction-1',
    undefined as unknown as string,
    undefined,
    undefined,
    undefined,
    'admin-1',
    ['rmu-admin'],
    undefined,
    npcs,
  );

describe('UpdateFactionHandler, NPCs (workspace spec 055)', () => {
  it('checks the NPCs for the owner of the faction and the realm of its campaign, and stores the resolved list', async () => {
    const { handler, resolve, events } = setup();

    const updated = await handler.execute(command([{ npcId: 'wolf', count: 3 }]));

    expect(resolve).toHaveBeenCalledWith([{ npcId: 'wolf', count: 3 }], { owner: 'player-1', realmId: 'realm-1' });
    expect(updated.npcs).toEqual([{ id: 'entry-0', npcId: 'wolf', name: 'Wolf', count: 3, notes: null }]);
    expect(events.published.map(p => p.event.eventType)).toEqual(['updated']);
  });

  it('does not check anything when the NPCs are not sent', async () => {
    const { handler, resolve, update } = setup();
    await handler.execute(command());
    expect(resolve).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('fails when the game of the faction is gone', async () => {
    const { handler } = setup(null);
    await expect(handler.execute(command([{ npcId: 'wolf', count: 1 }]))).rejects.toThrow(NotFoundError);
  });
});
