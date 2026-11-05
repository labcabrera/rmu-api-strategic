import { allowAllCharacterAccess } from '../../../support/allow-all-access.js';
import { fakeEventPublisher } from '../../../support/fake-event-publisher.js';
import type { CharacterAccess } from '../../../../../src/modules/characters/application/services/character-access.service.js';
import type { TalentSkillRanksService } from '../../../../../src/modules/characters/application/services/talent-skill-ranks.service.js';
import { AddTraitHandler } from '../../../../../src/modules/characters/application/cqrs/handlers/add-trait.handler.js';
import {
  AddTraitCommand,
  type AddTraitPurchase,
} from '../../../../../src/modules/characters/application/cqrs/commands/add-trait.command.js';
import type { TraitResponse } from '../../../../../src/modules/characters/application/ports/trait-client.port.js';
import type { CharacterRepository } from '../../../../../src/modules/characters/application/ports/character-repository.port.js';
import type { Character } from '../../../../../src/modules/characters/domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../../../src/modules/characters/domain/services/character-processor.service.js';
import { AttackProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/attack-processor.js';
import { DefenseProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/defense-processor.js';
import { EquipmentProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/equipment-processor.js';
import { HPProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/hp-processor.js';
import { InitiativeProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/initiative-processor.js';
import { MovementProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/movement-processor.js';
import { PowerProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/power-processor.js';
import { ResistancesProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/resistances-processor.js';
import { SkillProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/skill-processor.js';
import { StatProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/stat-processor.js';
import { XPProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/xp-processor.js';
import { effectiveSizeId } from '../../../../../src/modules/characters/domain/services/traits/effective-size.js';
import { CharacterTrait } from '../../../../../src/modules/characters/domain/value-objects/character-trait.vo.js';
import type { ItemRepository } from '../../../../../src/modules/items/application/ports/item-repository.port.js';
import type { GameRepository } from '../../../../../src/modules/games/application/ports/game-repository.port.js';
import { ForbiddenError } from '../../../../../src/modules/shared/domain/errors/errors.js';
import { buildCharacter, skill, trait } from './character.fixture.js';

// Workspace spec 077, block C in strategic: talent purchase. Invented catalog costs; the book examples only as numbers.

const entry = (id: string, isTalent: boolean, props: Partial<TraitResponse> = {}): TraitResponse => ({
  id,
  name: id,
  category: 'test',
  isTalent,
  specialization: null,
  isTierBased: true,
  maxTier: 5,
  adquisitionCost: isTalent ? 6 : -10,
  tierCost: isTalent ? 6 : -10,
  description: '',
  ...props,
});

const CATALOG: Record<string, TraitResponse> = {
  'light-sensitivity': entry('light-sensitivity', false),
  prodigy: entry('prodigy', true, {
    specialization: 'skill',
    adquisitionCost: 5,
    tierCost: 5,
    prerequisites: [{ type: 'skill' }, { type: 'training' }],
    possibleFlaws: ['light-sensitivity'],
  }),
  'gifted-born': entry('gifted-born', true, { prerequisites: [{ type: 'natural' }] }),
  'guild-talent': entry('guild-talent', true, { prerequisites: [{ type: 'profession', value: 'thief, fighter' }] }),
  inept: entry('inept', false, { specialization: 'skill', adquisitionCost: -4, tierCost: -4 }),
  'bad-temper': entry('bad-temper', false, { isTierBased: false, maxTier: null, adquisitionCost: -5, tierCost: null }),
  'odd-habit': entry('odd-habit', false, { isTierBased: false, maxTier: null, adquisitionCost: -5, tierCost: null }),
  'increased-size': entry('increased-size', true, { adquisitionCost: 30, tierCost: 30 }),
};

const processor = new CharacterProcessorService(
  new StatProcessor(),
  new MovementProcessor(),
  new InitiativeProcessor(),
  new SkillProcessor(),
  new EquipmentProcessor(),
  new HPProcessor(),
  new PowerProcessor(),
  new DefenseProcessor(),
  new XPProcessor(),
  new AttackProcessor(),
  new ResistancesProcessor(),
);

const setup = (
  options: { rules?: boolean; level?: number; master?: boolean; skills?: ReturnType<typeof skill>[]; traits?: CharacterTrait[] } = {},
) => {
  const character = buildCharacter({ devPoints: 100, level: options.level ?? 0, skills: options.skills, traits: options.traits });
  const characterRepository = { findById: vi.fn().mockResolvedValue(character), update: vi.fn().mockResolvedValue(character) };
  const gameRepository = {
    findById: vi.fn().mockResolvedValue({ id: 'game-001', options: { talentPurchaseRules: options.rules ?? false } }),
  };
  const master = options.master ?? true;
  const access = {
    ...allowAllCharacterAccess,
    checkManage: () => (master ? Promise.resolve() : Promise.reject(new ForbiddenError('Only the game master'))),
    canManage: () => Promise.resolve(master),
  } as unknown as CharacterAccess;
  const handler = new AddTraitHandler(
    { process: vi.fn() } as unknown as CharacterProcessorService,
    characterRepository as unknown as CharacterRepository,
    { findByCharacterId: vi.fn().mockResolvedValue([]) } as unknown as ItemRepository,
    { getTraitById: vi.fn((id: string) => Promise.resolve(CATALOG[id])) },
    fakeEventPublisher().publisher,
    gameRepository as unknown as GameRepository,
    access,
    { prepare: vi.fn().mockResolvedValue([]) } as unknown as TalentSkillRanksService,
  );
  const add = (traitId: string, tier?: number, specialization?: string, purchase: AddTraitPurchase = {}) =>
    handler.execute(new AddTraitCommand('character-001', traitId, tier, specialization, 'user-001', [], 'auto', undefined, purchase));
  return { character, add };
};

const owned = (character: Character, traitId: string) => character.traits.find(t => t.traitId === traitId)!;

describe('lowering a flaw (spec 077, C10)', () => {
  it('lowers Light Sensitivity III to II for 10 development points', async () => {
    const { character, add } = setup();
    await add('light-sensitivity', 3);
    expect(character.experience.availableDevPoints).toBe(130);
    await add('light-sensitivity', 2);
    expect(owned(character, 'light-sensitivity')).toMatchObject({ tier: 2, cost: -20 });
    expect(character.experience.availableDevPoints).toBe(120);
    expect(owned(character, 'light-sensitivity').paidWith).toMatchObject({ normal: -20 });
  });

  it('refuses to lower a talent', async () => {
    const { add } = setup();
    await add('prodigy', 2, 'perception');
    await expect(add('prodigy', 1, 'perception')).rejects.toMatchObject({ code: 'err-trait-tier-lower-talent' });
  });

  it('lets only the game master worsen a flaw', async () => {
    const player = setup({ master: false });
    await player.add('light-sensitivity', 1);
    await expect(player.add('light-sensitivity', 2)).rejects.toBeInstanceOf(ForbiddenError);
    const master = setup();
    await master.add('light-sensitivity', 1);
    await master.add('light-sensitivity', 2);
    expect(owned(master.character, 'light-sensitivity').tier).toBe(2);
  });
});

describe('restricted traits (spec 077, C12)', () => {
  it('halves the cost of a restricted Prodigy rounding up and leaves its effect out of the sheet', async () => {
    const { character, add } = setup();
    await add('prodigy', 3, 'perception', { restricted: { note: 'Only at night' } });
    // 5 + 2 × 5 = 15 -> 8
    expect(owned(character, 'prodigy')).toMatchObject({ cost: 8, restricted: { note: 'Only at night' } });
    expect(character.experience.availableDevPoints).toBe(92);

    const restricted = buildCharacter({ skills: [skill('perception', null, 2)], traits: [owned(character, 'prodigy')] });
    processor.process(restricted, []);
    const plain = buildCharacter({ skills: [skill('perception', null, 2)], traits: [trait('prodigy', 3, 'perception')] });
    processor.process(plain, []);
    expect(restricted.skills[0].traitBonus).toBe(0);
    expect(plain.skills[0].traitBonus).toBe(15);
  });

  it('halves a restricted flaw towards 0, and only the game master restricts', async () => {
    const { character, add } = setup();
    await add('inept', 3, 'perception', { restricted: { note: 'Only in the rain' } });
    // -12 -> -6
    expect(owned(character, 'inept').cost).toBe(-6);
    await expect(setup({ master: false }).add('prodigy', 1, 'perception', { restricted: { note: 'x' } })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe('talent purchase rules (spec 077, C11)', () => {
  it('checks nothing without the game option', async () => {
    const { character, add } = setup({ level: 3 });
    await add('gifted-born', 1);
    await add('bad-temper');
    await add('odd-habit');
    expect(owned(character, 'gifted-born').acquiredBy).toBeUndefined();
    expect(owned(character, 'odd-habit').pendingApproval).toBeUndefined();
  });

  it('acquires one tier of Prodigy per 10 ranks of its skill', async () => {
    const { character, add } = setup({ rules: true, master: false, skills: [skill('perception', null, 10)] });
    await add('prodigy', 1, 'perception');
    expect(owned(character, 'prodigy').acquiredBy).toEqual([{ tier: 1, type: 'skill', value: 'perception' }]);
    await expect(add('prodigy', 2, 'perception')).rejects.toMatchObject({ code: 'err-trait-prerequisite-unmet' });
  });

  it('accepts training from the game master only', async () => {
    const player = setup({ rules: true, master: false });
    await expect(player.add('prodigy', 1, 'perception', { prerequisite: { type: 'training' } })).rejects.toBeInstanceOf(ForbiddenError);
    const master = setup({ rules: true });
    await master.add('prodigy', 2, 'perception', { prerequisite: { type: 'training', note: 'Guild school' } });
    expect(owned(master.character, 'prodigy').acquiredBy).toEqual([
      { tier: 1, type: 'training', note: 'Guild school' },
      { tier: 2, type: 'training', note: 'Guild school' },
    ]);
    await expect(master.add('gifted-born', 1, undefined, { prerequisite: { type: 'training' } })).rejects.toMatchObject({
      code: 'err-trait-prerequisite-unmet',
    });
  });

  it('accepts a natural talent at creation and refuses it at level 3', async () => {
    await setup({ rules: true, level: 1 }).add('gifted-born', 1);
    await expect(setup({ rules: true, level: 3 }).add('gifted-born', 1)).rejects.toMatchObject({ code: 'err-trait-prerequisite-unmet' });
  });

  it('accepts a profession talent for the professions it names', async () => {
    const { character, add } = setup({ rules: true, level: 3 });
    await add('guild-talent', 2);
    expect(owned(character, 'guild-talent').acquiredBy).toEqual([
      { tier: 1, type: 'profession', value: 'fighter' },
      { tier: 2, type: 'profession', value: 'fighter' },
    ]);
  });

  it('refuses Inept in a skill without ranks', async () => {
    const { add } = setup({ rules: true, skills: [skill('perception'), skill('climbing', null, 2)] });
    await expect(add('inept', 1, 'perception')).rejects.toMatchObject({ code: 'err-flaw-not-hindering' });
    await add('inept', 1, 'climbing');
  });

  it('leaves a flaw it cannot check waiting for the game master, unless the master buys it', async () => {
    const player = setup({ rules: true, master: false });
    await player.add('bad-temper');
    expect(owned(player.character, 'bad-temper').pendingApproval).toBe(true);
    const master = setup({ rules: true });
    await master.add('bad-temper');
    expect(owned(master.character, 'bad-temper').pendingApproval).toBeUndefined();
  });

  it('allows a single loose flaw of up to -20', async () => {
    const { add } = setup({ rules: true });
    await add('bad-temper');
    await expect(add('odd-habit')).rejects.toMatchObject({ code: 'err-flaw-limit' });
    await expect(setup({ rules: true }).add('light-sensitivity', 3)).rejects.toMatchObject({ code: 'err-flaw-limit' });
  });

  it('links a flaw to a talent among its Possible Flaws, up to the cost of the talent', async () => {
    const { character, add } = setup({ rules: true, skills: [skill('perception', null, 20)] });
    await add('bad-temper');
    await add('prodigy', 2, 'perception');
    await add('light-sensitivity', 1, undefined, { linkedTo: { traitId: 'prodigy', specialization: 'perception' } });
    expect(owned(character, 'light-sensitivity').linkedTo).toEqual({ traitId: 'prodigy', specialization: 'perception' });
    await expect(
      add('odd-habit', undefined, undefined, { linkedTo: { traitId: 'prodigy', specialization: 'perception' } }),
    ).rejects.toMatchObject({
      code: 'err-flaw-not-linkable',
    });
    // Prodigy II costs 10: Light Sensitivity II (-20) exceeds it
    await expect(add('light-sensitivity', 2)).rejects.toMatchObject({ code: 'err-flaw-linked-exceeds' });
    expect(() => character.deleteTrait('prodigy', 'perception')).toThrow(expect.objectContaining({ code: 'err-trait-has-linked-flaws' }));
    character.deleteTrait('light-sensitivity', undefined);
    character.deleteTrait('prodigy', 'perception');
  });
});

describe('effective size (spec 077, C13)', () => {
  const sized = (sizeId: string, traits: CharacterTrait[]) => {
    const character = buildCharacter({ sizeId, traits, skills: [skill('body-development', null, 0)] });
    character.skills[0].customBonus = 40;
    processor.process(character, []);
    return character;
  };

  it('makes a Medium human with Increased Size I Big, with ×1.5 hits', () => {
    const plain = sized('medium', []);
    const big = sized('medium', [trait('increased-size', 1)]);
    expect(effectiveSizeId(big)).toBe('big');
    expect(big.info.sizeId).toBe('medium');
    expect(big.hp.max).toBe(Math.round(plain.hp.max * 1.5));
  });

  it('steps down from the size of the race with Decreased Size and stays within the scale', () => {
    expect(effectiveSizeId(sized('small', [trait('decreased-size', 2)]))).toBe('diminutive');
    expect(effectiveSizeId(sized('behemoth', [trait('increased-size', 3)]))).toBe('leviathan');
    expect(
      effectiveSizeId(
        sized('medium', [
          new CharacterTrait('increased-size', 'x', true, 1, 15, undefined, 'character', undefined, undefined, undefined, {
            restricted: { note: 'x' },
          }),
        ]),
      ),
    ).toBe('medium');
  });

  it('uses the effective size in the unarmed attacks', () => {
    const character = buildCharacter({ traits: [trait('increased-size', 1)], skills: [skill('unarmed-st', 'strikes', 1)] });
    processor.process(character, []);
    expect(character.attacks.find(a => a.attackName === 'unarmed-st-strikes')?.sizeAdjustment).toBe(1);
  });
});
