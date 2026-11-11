import { fakeEventPublisher } from '../../support/fake-event-publisher.js';
import { AwardGroupXpCommand } from '../../../../src/modules/characters/application/cqrs/commands/award-group-xp.command.js';
import { AwardGroupXpHandler } from '../../../../src/modules/characters/application/cqrs/handlers/award-group-xp.handler.js';
import type { CharacterRepository } from '../../../../src/modules/characters/application/ports/character-repository.port.js';
import { CharacterWriter } from '../../../../src/modules/characters/application/services/character-writer.service.js';
import { Character } from '../../../../src/modules/characters/domain/aggregates/character.js';
import type { CharacterProcessorService } from '../../../../src/modules/characters/domain/services/character-processor.service.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import { GameAccess } from '../../../../src/modules/games/application/services/game-access.service.js';
import { Game } from '../../../../src/modules/games/domain/aggregates/game.js';
import type { ItemRepository } from '../../../../src/modules/items/application/ports/item-repository.port.js';
import { ConflictError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { buildCharacter } from '../../domain/characters/traits/character.fixture.js';
import { gameProps } from '../../domain/games/game.fixture.js';

const MASTER = 'master-001';

const character = (id: string, xp = 10000): Character => {
  const built = buildCharacter({});
  const result = Character.fromProps({ ...built.getProps(), id, name: `Name ${id}`, gameId: 'game-001', owner: 'player-001' });
  result.experience.xp = xp;
  return result;
};

const setup = (characters: Character[], failing: string[] = []) => {
  const game = Game.fromProps(gameProps());
  const gameRepository = { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository;
  const update = vi.fn((c: Character) =>
    failing.includes(c.id) ? Promise.reject(new ConflictError('Stale', 'version-conflict')) : Promise.resolve(c),
  );
  const characterRepository = {
    findByGameId: vi.fn(() => Promise.resolve(characters)),
    findById: vi.fn((id: string) => Promise.resolve(characters.find(c => c.id === id) ?? null)),
    update,
  } as unknown as CharacterRepository;
  const itemRepository = { findByCharacterId: vi.fn(() => Promise.resolve([])) } as unknown as ItemRepository;
  const { publisher } = fakeEventPublisher();
  const handler = new AwardGroupXpHandler(
    gameRepository,
    characterRepository,
    itemRepository,
    new GameAccess(gameRepository),
    { process: vi.fn() } as unknown as CharacterProcessorService,
    new CharacterWriter(characterRepository, publisher),
  );
  return { handler, update };
};

const command = (xp: number, characterIds?: string[], userId = MASTER) =>
  new AwardGroupXpCommand('game-001', xp, characterIds, 'session', userId, []);

describe('AwardGroupXpHandler (spec 079, E)', () => {
  it('gives the whole amount to every live character of the game by default', async () => {
    const dead = character('dead');
    dead.status = 'dead';
    const { handler } = setup([character('a'), character('b', 12000), dead]);
    const result = await handler.execute(command(500));
    expect(result).toMatchObject({ gameId: 'game-001', xp: 500, eventType: 'session' });
    expect(result.characters.map(c => [c.characterId, c.xpBefore, c.xpAfter])).toEqual([
      ['a', 10000, 10500],
      ['b', 12000, 12500],
    ]);
  });

  it('gives it only to the chosen characters, and rejects one of another game', async () => {
    const { handler } = setup([character('a'), character('b')]);
    const result = await handler.execute(command(100, ['b']));
    expect(result.characters.map(c => c.characterId)).toEqual(['b']);
    await expect(handler.execute(command(100, ['x']))).rejects.toMatchObject({ code: 'err-group-xp-character-not-in-game' });
  });

  it('is for the masters of the game only', async () => {
    const { handler } = setup([character('a')]);
    await expect(handler.execute(command(100, undefined, 'player-001'))).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects an invalid amount and a game without characters', async () => {
    await expect(setup([character('a')]).handler.execute(command(0))).rejects.toMatchObject({ code: 'err-group-xp-invalid' });
    await expect(setup([]).handler.execute(command(10))).rejects.toMatchObject({ code: 'err-group-xp-no-characters' });
  });

  it('records a character that fails and goes on with the others', async () => {
    const { handler } = setup([character('failing'), character('ok')], ['failing']);
    const result = await handler.execute(command(50));
    expect(result.characters[0]).toMatchObject({ characterId: 'failing', error: { code: 'version-conflict' } });
    expect(result.characters[1]).toMatchObject({ characterId: 'ok', xpAfter: 10050 });
  });
});
