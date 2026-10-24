import { fakeEventPublisher } from '../../../support/fake-event-publisher.js';
import { AddTraitHandler } from '../../../../../src/modules/characters/application/cqrs/handlers/add-trait.handler.js';
import { AddTraitCommand } from '../../../../../src/modules/characters/application/cqrs/commands/add-trait.command.js';
import { CharacterProcessorService } from '../../../../../src/modules/characters/domain/services/character-processor.service.js';
import { ValidationError } from '../../../../../src/modules/shared/domain/errors/errors.js';
import { buildCharacter } from './character.fixture.js';
import type { TraitResponse } from '../../../../../src/modules/characters/application/ports/trait-client.port.js';
import type { CharacterRepository } from '../../../../../src/modules/characters/application/ports/character-repository.port.js';
import type { ItemRepository } from '../../../../../src/modules/items/application/ports/item-repository.port.js';
import type { GameRepository } from '../../../../../src/modules/games/application/ports/game-repository.port.js';
import { GamePowerLevel } from '../../../../../src/modules/games/domain/value-objects/game-power-level.vo.js';

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
  const characterRepository = { findById: vi.fn().mockResolvedValue(character), update: vi.fn().mockResolvedValue(character) };
  const gameRepository = { findById: vi.fn().mockResolvedValue({ id: 'game-001', powerLevel }) };
  const handler = new AddTraitHandler(
    { process: vi.fn() } as unknown as CharacterProcessorService,
    characterRepository as unknown as CharacterRepository,
    { findByCharacterId: vi.fn().mockResolvedValue([]) } as unknown as ItemRepository,
    { getTraitById: vi.fn((id: string) => Promise.resolve(catalog[id] as TraitResponse)) },
    fakeEventPublisher().publisher,
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

describe('AddTraitHandler command validation', () => {
  const expectCode = async (cmd: AddTraitCommand, errorCode: string) => {
    const { handler, character } = setup({ baseDevPoints: 60 });
    await expect(handler.execute(cmd)).rejects.toBeInstanceOf(ValidationError);
    await expect(handler.execute(cmd)).rejects.toMatchObject({ errorCode });
    expect(character.traits).toHaveLength(0);
  };

  it('rejects a tier based trait without tier with err-trait-tier-required', async () => {
    await expectCode(command('fast-attack'), 'err-trait-tier-required');
  });

  it('rejects a negative tier with err-trait-tier-invalid', async () => {
    await expectCode(command('fast-attack', -1), 'err-trait-tier-invalid');
  });

  it('rejects a tier above the max tier with err-trait-tier-invalid', async () => {
    await expectCode(command('fast-attack', 6), 'err-trait-tier-invalid');
  });

  it('rejects a tier on a non tier based trait with err-trait-tier-invalid', async () => {
    await expectCode(command('recurved-musculature', 1), 'err-trait-tier-invalid');
  });

  it('rejects a missing specialization with err-trait-specialization-required', async () => {
    await expectCode(command('prodigy', 1), 'err-trait-specialization-required');
  });

  it('rejects an unexpected specialization with err-trait-specialization-not-allowed', async () => {
    await expectCode(command('fast-attack', 1, 'perception'), 'err-trait-specialization-not-allowed');
  });
});
