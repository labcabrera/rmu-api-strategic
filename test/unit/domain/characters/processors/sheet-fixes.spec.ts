import { ResistancesProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/resistances-processor';
import { HPProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/hp-processor';
import { SkillProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/skill-processor';
import { SetupProfessionSkillHandler } from '../../../../../src/modules/characters/application/cqrs/handlers/setup-professional-skill.handler';
import { SetUpProfessionalSkillCommand } from '../../../../../src/modules/characters/application/cqrs/commands/setup-professional-skill.command';
import { CharacterProcessorService } from '../../../../../src/modules/characters/domain/services/character-processor.service';
import type { CharacterRepository } from '../../../../../src/modules/characters/application/ports/character-repository.port';
import type { ItemRepository } from '../../../../../src/modules/items/application/ports/item-repository.port';
import type { GameRepository } from '../../../../../src/modules/games/application/ports/game-repository.port';
import { buildCharacter, skill } from '../traits/character.fixture';

describe('Resistances level bonus', () => {
  it('acceptance 9: a level 3 character gets +6 to every resistance', () => {
    const character = buildCharacter({ level: 3 });
    new ResistancesProcessor().process(character);
    expect(character.resistances).toHaveLength(5);
    character.resistances.forEach(r => {
      expect(r.levelBonus).toBe(6);
      expect(r.totalBonus).toBe(r.statBonus + r.racialBonus + r.realmBonus + (r.customBonus || 0) + r.traitBonus + 6);
    });
  });

  it('level 0 gets no level bonus', () => {
    const character = buildCharacter({ level: 0 });
    new ResistancesProcessor().process(character);
    expect(character.resistances.map(r => r.levelBonus)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('Hit points by size', () => {
  const bodyDevelopment = (total: number) => {
    const s = skill('body-development');
    s.totalBonus = total;
    return s;
  };

  it('acceptance 10: a small character has 0.75 of the hits', () => {
    const character = buildCharacter({ sizeId: 'small', skills: [bodyDevelopment(40)] });
    new HPProcessor().process(character);
    expect([character.hp.max, character.hp.current]).toEqual([30, 30]);
  });

  it('a big character has 1.5 of the hits and a medium one keeps them', () => {
    const big = buildCharacter({ sizeId: 'big', skills: [bodyDevelopment(40)] });
    new HPProcessor().process(big);
    expect(big.hp.max).toBe(60);
    const medium = buildCharacter({ sizeId: 'medium', skills: [bodyDevelopment(40)] });
    new HPProcessor().process(medium);
    expect(medium.hp.max).toBe(40);
  });

  it('keeps the damage taken when the maximum changes', () => {
    const character = buildCharacter({ sizeId: 'small', skills: [bodyDevelopment(40)] });
    character.hp.max = 40;
    character.hp.current = 30;
    new HPProcessor().process(character);
    expect([character.hp.max, character.hp.current]).toEqual([30, 20]);
  });
});

describe('Knacks by power level', () => {
  const setup = (powerLevel: Record<string, number>) => {
    const skills = ['perception', 'stalking', 'climbing', 'swimming'].map(id => skill(id));
    const character = buildCharacter({ skills });
    const handler = new SetupProfessionSkillHandler(
      { process: vi.fn() } as unknown as CharacterProcessorService,
      {
        findById: vi.fn().mockResolvedValue(character),
        update: vi.fn().mockResolvedValue(character),
      } as unknown as CharacterRepository,
      { findByCharacterId: vi.fn().mockResolvedValue([]) } as unknown as ItemRepository,
      {
        findById: vi.fn().mockResolvedValue({ id: 'game-001', powerLevel: { baseDevPoints: 60, ...powerLevel } }),
      } as unknown as GameRepository,
    );
    const knack = (skillId: string) =>
      handler.execute(new SetUpProfessionalSkillCommand('character-001', skillId, null, ['knack'], 'user-001', []));
    return { character, knack };
  };

  it('allows knackCount knacks with the power level bonus', async () => {
    const { character, knack } = setup({ knackCount: 3, knackBonus: 10 });
    await knack('perception');
    await knack('stalking');
    await knack('climbing');
    await expect(knack('swimming')).rejects.toMatchObject({ errorCode: 'err-skill-max-knacks' });
    new SkillProcessor().process(character, []);
    expect(character.findSkill('perception', null)!.professionalBonus).toBe(10);
    expect(character.findSkill('swimming', null)!.professionalBonus).toBe(0);
  });

  it('defaults to 2 knacks of +5', async () => {
    const { character, knack } = setup({});
    await knack('perception');
    await knack('stalking');
    await expect(knack('climbing')).rejects.toMatchObject({ errorCode: 'err-skill-max-knacks' });
    new SkillProcessor().process(character, []);
    expect(character.findSkill('perception', null)!.professionalBonus).toBe(5);
  });

  it('allows no knacks with a knackCount of 0', async () => {
    const { knack } = setup({ knackCount: 0 });
    await expect(knack('perception')).rejects.toMatchObject({ errorCode: 'err-skill-max-knacks' });
  });
});
