import { fakeEventPublisher } from '../../support/fake-event-publisher.js';
import type { CharacterAccess } from '../../../../src/modules/characters/application/services/character-access.service.js';
import { PassTimeCommand } from '../../../../src/modules/characters/application/cqrs/commands/pass-time.command.js';
import { PassTimeHandler } from '../../../../src/modules/characters/application/cqrs/handlers/pass-time.handler.js';
import type { CharacterRepository } from '../../../../src/modules/characters/application/ports/character-repository.port.js';
import type { HealingLogRepository } from '../../../../src/modules/characters/application/ports/healing-log-repository.port.js';
import type { HealingTablesClientPort } from '../../../../src/modules/characters/application/ports/healing-tables-client.port.js';
import { CharacterHealthStore } from '../../../../src/modules/characters/application/services/character-health.store.js';
import { CharacterRestService } from '../../../../src/modules/characters/application/services/character-rest.service.js';
import { Character } from '../../../../src/modules/characters/domain/aggregates/character.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import type { GameTimeLogRepository } from '../../../../src/modules/games/application/ports/game-time-log-repository.port.js';
import { GameAccess } from '../../../../src/modules/games/application/services/game-access.service.js';
import { Game } from '../../../../src/modules/games/domain/aggregates/game.js';
import { GameCalendar } from '../../../../src/modules/games/domain/value-objects/game-calendar.vo.js';
import type { GameTimeLogEntry, PassTimeActivity } from '../../../../src/modules/games/domain/value-objects/game-time-log-entry.vo.js';
import { ConflictError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { buildCharacter } from '../../domain/characters/traits/character.fixture.js';
import { injury, TABLES } from '../../domain/characters/healing/healing.fixture.js';
import { gameProps } from '../../domain/games/game.fixture.js';

const MASTER = 'master-001';

const character = (id: string, hp = 10): Character => {
  const built = buildCharacter({});
  const result = Character.fromProps({ ...built.getProps(), id, name: `Name ${id}`, gameId: 'game-001', owner: 'player-001' });
  result.hp.max = 30;
  result.hp.current = hp;
  return result;
};

const setup = (characters: Character[], calendar = new GameCalendar('Spring', 0, 0)) => {
  const game = Game.fromProps(gameProps({ calendar })).restoreVersion(3);
  const stored = { game };
  const updateGame = vi.fn((g: Game) => {
    stored.game = g;
    return Promise.resolve(g);
  });
  const gameRepository = { findById: vi.fn(() => Promise.resolve(stored.game)), update: updateGame } as unknown as GameRepository;
  const updateCharacter = vi.fn((c: Character) => Promise.resolve(c));
  const characterRepository = {
    findById: vi.fn((id: string) => Promise.resolve(characters.find(c => c.id === id) ?? null)),
    findByGameId: vi.fn(() => Promise.resolve(characters)),
    update: updateCharacter,
  } as unknown as CharacterRepository;
  const logEntries: GameTimeLogEntry[] = [];
  const timeLog = {
    save: vi.fn((entry: GameTimeLogEntry) => {
      logEntries.push(entry);
      return Promise.resolve(entry);
    }),
  } as unknown as GameTimeLogRepository;
  const saveHealingLog = vi.fn<(characterId: string, gameId: string, entries: unknown[]) => Promise<void>>(() => Promise.resolve());
  const healingLog = { saveAll: saveHealingLog } as unknown as HealingLogRepository;
  const { publisher } = fakeEventPublisher();
  const store = new CharacterHealthStore(
    characterRepository,
    gameRepository,
    healingLog,
    publisher,
    { canManage: (game: Game | null, userId: string) => game?.owner === userId } as unknown as GameAccess,
    { canChange: (c: Character, userId: string) => Promise.resolve(c.owner === userId) } as unknown as CharacterAccess,
  );
  const tables: HealingTablesClientPort = { getHealingTables: () => Promise.resolve(TABLES) };
  const handler = new PassTimeHandler(
    gameRepository,
    timeLog,
    characterRepository,
    publisher,
    new GameAccess(gameRepository),
    store,
    new CharacterRestService(tables),
  );
  return { handler, game, updateGame, updateCharacter, logEntries, saveHealingLog };
};

const command = (
  props: Partial<{
    days: number;
    hours: number;
    characters: { characterId: string; activity: PassTimeActivity }[];
    dryRun: boolean;
    version: number;
    userId: string;
  }> = {},
) =>
  new PassTimeCommand(
    'game-001',
    props.days ?? 0,
    props.hours ?? 0,
    'Journey',
    props.characters ?? [],
    props.dryRun ?? false,
    props.version ?? 3,
    props.userId ?? MASTER,
    [],
  );

describe('PassTimeHandler (spec 065)', () => {
  it('advances the calendar and rests every character with its activity', async () => {
    const resting = character('resting');
    const sleeping = character('sleeping');
    sleeping.injuries = [injury({ id: 'i-1', penalty: -20, initialPenalty: -20 })];
    sleeping.injuries[0].recovery = {
      roll: 50,
      modifiers: 0,
      total: 50,
      baseDays: 10,
      multiplier: 1,
      totalDays: 10,
      remainingDays: 10,
      startedAt: '',
    };
    const away = character('away');
    const { handler, game, logEntries } = setup([resting, sleeping, away]);

    const result = await handler.execute(
      command({
        days: 1,
        characters: [
          { characterId: 'sleeping', activity: 'full-rest' },
          { characterId: 'away', activity: 'excluded' },
        ],
      }),
    );

    expect(game.calendar).toMatchObject({ elapsedDays: 1, elapsedHours: 0 });
    expect(result).toMatchObject({ fromDay: 1, toDay: 2, days: 1, hours: 0, dryRun: false });
    expect(result.characters.map(c => [c.characterId, c.activity])).toEqual([
      ['resting', 'rest'],
      ['sleeping', 'full-rest'],
      ['away', 'excluded'],
    ]);
    // 24 h: 12 periods of 10% of 30 hits
    expect(resting.hp.current).toBe(30);
    expect(away.hp.current).toBe(10);
    expect(result.characters[2].result).toBeUndefined();
    // full rest: each day counts double
    expect(sleeping.injuries[0].recovery?.remainingDays).toBe(8);
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({ type: 'pass-time', fromDay: 1, toDay: 2, note: 'Journey', userId: MASTER });
    expect(result.logEntryId).toBe(logEntries[0].id);
  });

  it('stamps the day after the step on the healing log', async () => {
    const resting = character('resting');
    const { handler, saveHealingLog } = setup([resting], new GameCalendar('', 4, 0));
    await handler.execute(command({ days: 2 }));
    expect(saveHealingLog.mock.calls[0][2]).toEqual([expect.objectContaining({ kind: 'rest', gameDay: 7 })]);
  });

  it('keeps the loose hours without moving the day', async () => {
    const { handler, game } = setup([character('a')]);
    const result = await handler.execute(command({ hours: 10 }));
    expect(result).toMatchObject({ fromDay: 1, toDay: 1 });
    expect(game.calendar.elapsedHours).toBe(10);
  });

  it('stores nothing on a dry run', async () => {
    const resting = character('resting');
    const { handler, game, updateGame, updateCharacter, logEntries } = setup([resting]);
    const result = await handler.execute(command({ hours: 8, dryRun: true }));
    expect(result).toMatchObject({ fromDay: 1, toDay: 1, dryRun: true });
    expect(result.characters[0].result).toMatchObject({ hpBefore: 10, hpAfter: 22 });
    expect(game.calendar.elapsedHours).toBe(0);
    expect(updateGame).not.toHaveBeenCalled();
    expect(updateCharacter).not.toHaveBeenCalled();
    expect(logEntries).toHaveLength(0);
  });

  it('skips the dead and rejects resting them or characters of another game', async () => {
    const dead = character('dead');
    dead.status = 'dead';
    const { handler } = setup([character('a'), dead]);
    const result = await handler.execute(command({ days: 1 }));
    expect(result.characters.map(c => c.characterId)).toEqual(['a']);
    await expect(handler.execute(command({ days: 1, characters: [{ characterId: 'dead', activity: 'rest' }] }))).rejects.toMatchObject({
      code: 'err-character-dead',
    });
    await expect(handler.execute(command({ days: 1, characters: [{ characterId: 'other', activity: 'rest' }] }))).rejects.toMatchObject({
      code: 'err-pass-time-character-not-in-game',
    });
  });

  it('checks the time, the owner and the version before changing anything', async () => {
    const { handler, updateGame } = setup([character('a')]);
    await expect(handler.execute(command())).rejects.toMatchObject({ code: 'err-pass-time-required' });
    await expect(handler.execute(command({ days: 366 }))).rejects.toMatchObject({ code: 'err-pass-time-too-long' });
    await expect(handler.execute(command({ days: 1, userId: 'player-001' }))).rejects.toMatchObject({ statusCode: 403 });
    await expect(handler.execute(command({ days: 1, version: 2 }))).rejects.toMatchObject({ code: 'version-conflict' });
    expect(updateGame).not.toHaveBeenCalled();
  });

  it('records a character that fails and goes on with the rest', async () => {
    const failing = character('failing');
    const resting = character('resting');
    const { handler, game, updateCharacter, logEntries } = setup([failing, resting]);
    updateCharacter.mockImplementationOnce(() => Promise.reject(new ConflictError('stale', 'version-conflict')));
    const result = await handler.execute(command({ days: 1 }));
    expect(game.calendar.elapsedDays).toBe(1);
    expect(result.characters[0]).toMatchObject({ characterId: 'failing', error: { code: 'version-conflict' } });
    expect(result.characters[1].result).toBeDefined();
    expect(logEntries[0].characters[0].error?.code).toBe('version-conflict');
  });
});
