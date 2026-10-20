import { AddTraitHandler } from 'src/modules/characters/application/cqrs/handlers/add-trait.handler';
import { AddTraitCommand } from 'src/modules/characters/application/cqrs/commands/add-trait.command';
import { CharacterProcessorService } from 'src/modules/characters/domain/services/character-processor.service';
import type { TraitResponse } from 'src/modules/characters/application/ports/trait-client.port';
import type { CharacterRepository } from 'src/modules/characters/application/ports/character.repository';
import type { CharacterEventBusPort } from 'src/modules/characters/application/ports/character-event-bus.port';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';
import type { GameRepository } from 'src/modules/games/application/ports/game.repository';
import type { GameOptions } from 'src/modules/games/domain/value-objects/game-options.vo';
import type { GamePowerLevel } from 'src/modules/games/domain/value-objects/game-power-level.vo';
import { buildCharacter } from '../traits/character.fixture';

const catalog: Record<string, Partial<TraitResponse>> = {
  'fast-attack': {
    id: 'fast-attack',
    name: 'Fast Attack',
    isTalent: true,
    specialization: null,
    isTierBased: true,
    maxTier: 5,
    adquisitionCost: 10,
    tierCost: 5,
  },
  'quick-draw': {
    id: 'quick-draw',
    name: 'Quick Draw',
    isTalent: true,
    specialization: null,
    isTierBased: false,
    maxTier: null,
    adquisitionCost: 5,
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
};

const setup = (
  props: { level?: number; devPoints?: number; bonusDevPoints?: number },
  options: Partial<GameOptions>,
  powerLevel: Partial<GamePowerLevel> = {},
) => {
  const character = buildCharacter(props);
  const handler = new AddTraitHandler(
    { process: jest.fn() } as unknown as CharacterProcessorService,
    {
      findById: jest.fn().mockResolvedValue(character),
      update: jest.fn().mockResolvedValue(character),
    } as unknown as CharacterRepository,
    { findByCharacterId: jest.fn().mockResolvedValue([]) } as unknown as ItemRepository,
    { getTraitById: jest.fn((id: string) => Promise.resolve(catalog[id] as TraitResponse)) },
    { publish: jest.fn() } as CharacterEventBusPort,
    {
      findById: jest.fn().mockResolvedValue({ id: 'game-001', powerLevel: { baseDevPoints: 60, ...powerLevel }, options }),
    } as unknown as GameRepository,
  );
  const add = (traitId: string, tier?: number, specialization?: string) =>
    handler.execute(new AddTraitCommand('character-001', traitId, tier, specialization, 'user-001', []));
  return { character, add };
};

describe('Talent policy', () => {
  describe("'free'", () => {
    it('pays a talent with normal points first and then with bonus points', async () => {
      const { character, add } = setup({ level: 2, devPoints: 4, bonusDevPoints: 30 }, { talentPolicy: 'free' });
      await add('fast-attack', 1);
      expect(character.traits[0].paidWith).toMatchObject({ normal: 4, bonus: 6, flaw: 0 });
    });

    it('does not apply the per level limit to talents at creation by default', async () => {
      const { character, add } = setup({ level: 0, devPoints: 0, bonusDevPoints: 50 }, {}, { raceDevPointsPerLevel: 5, maxTraitCost: 30 });
      await add('fast-attack', 3);
      expect(character.traits[0].paidWith).toMatchObject({ normal: 0, bonus: 20, cappedBonus: 0 });
      expect(character.experience.bonusDevPointsSpentThisLevel).toBe(0);
    });

    it('applies the limit at creation with bonusDevPointsCapAtCreation', async () => {
      const { character, add } = setup(
        { level: 0, devPoints: 0, bonusDevPoints: 50 },
        { bonusDevPointsCapAtCreation: true },
        { raceDevPointsPerLevel: 5 },
      );
      await expect(add('fast-attack', 1)).rejects.toThrow('Insufficient development points');
      expect(character.traits).toHaveLength(0);
    });

    it('adds the points of a flaw to the normal pool', async () => {
      const { character, add } = setup({ level: 0, devPoints: 0 }, {});
      await add('inept', 2, 'perception');
      expect(character.experience.availableDevPoints).toBe(8);
      expect(character.experience.flawDevPoints).toBe(0);
    });
  });

  describe("'race-points-at-creation'", () => {
    const options: Partial<GameOptions> = { talentPolicy: 'race-points-at-creation' };

    it('pays talents at creation only with bonus points', async () => {
      const { character, add } = setup({ level: 1, devPoints: 60, bonusDevPoints: 12 }, options);
      await add('fast-attack', 1);
      expect(character.traits[0].paidWith).toMatchObject({ normal: 0, bonus: 10 });
      expect(character.experience.availableDevPoints).toBe(60);
      await expect(add('fast-attack', 2)).rejects.toMatchObject({ errorCode: 'err-talent-policy-bonus-points-only' });
    });

    it('acceptance 6: rejects a new talent at level 2 and allows improving an owned one', async () => {
      const { character, add } = setup({ level: 1, devPoints: 60, bonusDevPoints: 10 }, options);
      await add('fast-attack', 1);
      character.levelUp(true);
      expect(character.experience.level).toBe(2);
      character.experience.availableDevPoints = 20;

      await expect(add('inept', 1, 'perception')).resolves.toBeDefined(); // flaws are not talents
      await expect(add('fast-attack', 3)).resolves.toBeDefined();
      const improved = character.traits.find(t => t.traitId === 'fast-attack')!;
      expect([improved.tier, improved.cost]).toEqual([3, 20]);
      expect(improved.paidWith).toMatchObject({ normal: 10, bonus: 10, level: 2 });
      expect(character.experience.availableDevPoints).toBe(20 + 4 - 10);
    });

    it('rejects buying a new talent after creation with err-talent-policy-creation-only', async () => {
      const { add } = setup({ level: 2, devPoints: 60, bonusDevPoints: 10 }, options);
      await expect(add('quick-draw')).rejects.toMatchObject({ errorCode: 'err-talent-policy-creation-only' });
    });
  });

  describe("'flaw-points-at-creation'", () => {
    const options: Partial<GameOptions> = { talentPolicy: 'flaw-points-at-creation' };

    it('keeps the points of flaws apart and pays talents only with them at creation', async () => {
      const { character, add } = setup({ level: 0, devPoints: 0, bonusDevPoints: 40 }, options);
      await add('inept', 3, 'perception');
      expect(character.experience.flawDevPoints).toBe(12);
      expect(character.experience.availableDevPoints).toBe(0);
      await add('fast-attack', 1);
      expect(character.traits.find(t => t.traitId === 'fast-attack')!.paidWith).toMatchObject({ flaw: 10, bonus: 0, normal: 0 });
      expect(character.experience.flawDevPoints).toBe(2);
      await expect(add('fast-attack', 2)).rejects.toMatchObject({ errorCode: 'err-talent-policy-flaw-points-only' });
    });

    it('cannot remove a flaw whose points paid a talent', async () => {
      const { character, add } = setup({ level: 0, devPoints: 0 }, options);
      await add('inept', 3, 'perception');
      await add('fast-attack', 1);
      expect(() => character.deleteTrait('inept', 'perception')).toThrow();
      character.deleteTrait('fast-attack', undefined);
      character.deleteTrait('inept', 'perception');
      expect(character.experience.flawDevPoints).toBe(0);
    });

    it('pays talents normally after creation', async () => {
      const { character, add } = setup({ level: 2, devPoints: 20 }, options);
      await add('fast-attack', 1);
      expect(character.traits[0].paidWith).toMatchObject({ normal: 10, flaw: 0 });
    });
  });
});
