import { MongoCharacterRepository } from 'src/modules/characters/infrastructure/db/mongo.character.repository';
import { Character } from 'src/modules/characters/domain/aggregates/character.aggregate';
import { RsqlParser } from 'src/modules/shared/infrastructure/persistence/repositories/rsql-parser';

// The mongoose schema is not needed to test the mapping
jest.mock('src/modules/characters/infrastructure/persistence/models/character.model', () => ({
  CharacterModel: { name: 'CharacterModel' },
}));

// Character document stored before spec 009
const legacyDocument = {
  _id: 'character-001',
  gameId: 'game-001',
  faction: { id: 'faction-001', name: 'Faction' },
  name: 'Legacy',
  info: { race: { id: 'race-001', name: 'Race' }, professionId: 'fighter', sizeId: 'medium', realmType: 'essence', height: 1, weight: 1 },
  roleplay: {},
  experience: {
    level: 1,
    availableLevel: 1,
    xp: 10000,
    devPoints: 60,
    availableDevPoints: 12,
    availableRaceDevPoints: 7,
    availableStatLevelUp: 0,
    developedStatLevelUp: 0,
    weaponDevelopment: ['melee', 'ranged', 'shield', 'unarmed'],
  },
  statistics: {},
  skills: [
    {
      skillId: 'perception',
      specialization: null,
      statistics: [],
      development: [2, 4],
      professional: null,
      ranks: 3,
      ranksDeveloped: 1,
      statBonus: 0,
      racialBonus: 0,
      developmentBonus: 15,
      professionalBonus: 0,
      customBonus: 0,
      totalBonus: 15,
    },
  ],
  traits: [{ traitId: 'fast-attack', traitName: 'Fast Attack', isTalent: true, tier: 1, cost: 10 }],
};

const map = (doc: unknown): Character =>
  (new MongoCharacterRepository({} as never, {} as RsqlParser) as unknown as { mapToEntity: (d: unknown) => Character }).mapToEntity(doc);

describe('Character documents stored before spec 009', () => {
  it('reads availableRaceDevPoints as availableBonusDevPoints', () => {
    const character = map(legacyDocument);
    expect(character.experience).toMatchObject({ availableBonusDevPoints: 7, bonusDevPointsSpentThisLevel: 0, flawDevPoints: 0 });
  });

  it('prefers the new name when both exist', () => {
    const character = map({ ...legacyDocument, experience: { ...legacyDocument.experience, availableBonusDevPoints: 3 } });
    expect(character.experience.availableBonusDevPoints).toBe(3);
  });

  it('treats old ranks as developed with normal points and old traits as paid with normal points', () => {
    const character = map(legacyDocument);
    const skill = character.findSkill('perception', null)!;
    expect([skill.cultureRanks, skill.devPointsSpent]).toEqual([0, { normal: 0, bonus: 0 }]);
    character.levelDownSkill('perception', null);
    expect(character.experience.availableDevPoints).toBe(14);
    character.deleteTrait('fast-attack', undefined);
    expect(character.experience.availableDevPoints).toBe(24);
    expect(character.experience.availableBonusDevPoints).toBe(7);
  });
});
