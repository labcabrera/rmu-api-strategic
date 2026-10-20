import { AddTraitHandler } from 'src/modules/characters/application/cqrs/handlers/add-trait.handler';
import { AddTraitCommand } from 'src/modules/characters/application/cqrs/commands/add-trait.command';
import { CharacterProcessorService } from 'src/modules/characters/domain/services/character-processor.service';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import { buildCharacter } from './character.fixture';
import type { TraitResponse } from 'src/modules/characters/application/ports/trait-client.port';
import type { CharacterRepository } from 'src/modules/characters/application/ports/character.repository';
import type { CharacterEventBusPort } from 'src/modules/characters/application/ports/character-event-bus.port';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';
import type { GameRepository } from 'src/modules/games/application/ports/game.repository';
import { GamePowerLevel } from 'src/modules/games/domain/value-objects/game-power-level.vo';

const catalog: Record<string, Partial<TraitResponse>> = {
  'fast-attack': {
    id: 'fast-attack',
    name: 'Fast Attack',
    isTalent: true,
    specialization: null,
    isTierBased: true,
    maxTier: 5,
    adquisitionCost: 10,
    tierCost: 10,
  },
  'recurved-musculature': {
    id: 'recurved-musculature',
    name: 'Recurved Musculature',
    isTalent: true,
    specialization: null,
    isTierBased: false,
    maxTier: null,
    adquisitionCost: 30,
    tierCost: null,
  },
  inept: {
    id: 'inept',
    name: 'Inept',
    isTalent: false,
    specialization: 'skill',
    isTierBased: true,
    maxTier: 10,
    adquisitionCost: -4,
    tierCost: -4,
  },
  prodigy: {
    id: 'prodigy',
    name: 'Prodigy',
    isTalent: true,
    specialization: 'skill',
    isTierBased: true,
    maxTier: 10,
    adquisitionCost: 6,
    tierCost: 6,
  },
};

const setup = (powerLevel: Partial<GamePowerLevel>) => {
  const character = buildCharacter({ devPoints: 100 });
  const characterRepository = { findById: jest.fn().mockResolvedValue(character), update: jest.fn().mockResolvedValue(character) };
  const gameRepository = { findById: jest.fn().mockResolvedValue({ id: 'game-001', powerLevel }) };
  const handler = new AddTraitHandler(
    { process: jest.fn() } as unknown as CharacterProcessorService,
    characterRepository as unknown as CharacterRepository,
    { findByCharacterId: jest.fn().mockResolvedValue([]) } as unknown as ItemRepository,
    { getTraitById: jest.fn((id: string) => Promise.resolve(catalog[id] as TraitResponse)) },
    { publish: jest.fn() } as CharacterEventBusPort,
    gameRepository as unknown as GameRepository,
  );
  return { character, handler };
};

const command = (traitId: string, tier?: number, specialization?: string) =>
  new AddTraitCommand('character-001', traitId, tier, specialization, 'user-001', []);

describe('AddTraitHandler max trait cost', () => {
  it('rejects a 24 DP talent with the default Superior limit (20)', async () => {
    const { handler, character } = setup({ baseDevPoints: 60 });
    const promise = handler.execute(command('prodigy', 4, 'perception'));
    await expect(promise).rejects.toThrow(ValidationError);
    await expect(handler.execute(command('prodigy', 4, 'perception'))).rejects.toMatchObject({ errorCode: 'err-trait-max-cost' });
    expect(character.traits).toHaveLength(0);
  });

  it('rejects a non tier based talent above the limit', async () => {
    const { handler } = setup({ baseDevPoints: 60, maxTraitCost: 20 });
    await expect(handler.execute(command('recurved-musculature'))).rejects.toMatchObject({ errorCode: 'err-trait-max-cost' });
  });

  it('accepts a talent equal to the limit', async () => {
    const { handler, character } = setup({ baseDevPoints: 60 });
    await handler.execute(command('fast-attack', 2));
    expect(character.traits.map(t => [t.traitId, t.cost, t.source])).toEqual([['fast-attack', 20, 'character']]);
  });

  it('uses the game limit when it is defined', async () => {
    const { handler, character } = setup({ baseDevPoints: 60, maxTraitCost: 30 });
    await handler.execute(command('prodigy', 4, 'perception'));
    expect(character.traits).toHaveLength(1);
  });

  it('does not limit flaws', async () => {
    const { handler, character } = setup({ baseDevPoints: 60, maxTraitCost: 5 });
    await handler.execute(command('inept', 10, 'perception'));
    expect(character.traits.map(t => t.cost)).toEqual([-40]);
  });
});
