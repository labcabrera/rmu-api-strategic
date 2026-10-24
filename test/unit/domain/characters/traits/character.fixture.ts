import { Character } from '../../../../../src/modules/characters/domain/aggregates/character.aggregate';
import { CharacterEndurance } from '../../../../../src/modules/characters/domain/value-objects/character-endurance.vo';
import { CharacterDefense } from '../../../../../src/modules/characters/domain/value-objects/character-defense.vo';
import { CharacterEquipment } from '../../../../../src/modules/characters/domain/value-objects/character-equipment.vo';
import { CharacterInitiative } from '../../../../../src/modules/characters/domain/value-objects/character-initiative.vo';
import { CharacterMovement } from '../../../../../src/modules/characters/domain/value-objects/character-movement.vo';
import { CharacterSkill } from '../../../../../src/modules/characters/domain/value-objects/character-skill.vo';
import { CharacterStat, STAT_KEYS, StatKey } from '../../../../../src/modules/characters/domain/value-objects/character-stat.vo';
import { CharacterTrait, CharacterTraitSource } from '../../../../../src/modules/characters/domain/value-objects/character-trait.vo';
import { CharacterXP } from '../../../../../src/modules/characters/domain/value-objects/character-xp.vo';
import { NamedEntity } from '../../../../../src/modules/shared/domain/entities/named-entity';
import { Item } from '../../../../../src/modules/items/domain/aggregates/item.aggregate';
import { ItemWeapon } from '../../../../../src/modules/items/domain/value-objects/item-weapon.vo';
import { ItemWeaponMode } from '../../../../../src/modules/items/domain/value-objects/item-weapon-mode.vo';
import { ItemWeaponRange } from '../../../../../src/modules/items/domain/value-objects/item-weapon-range.vo';

export const trait = (
  traitId: string,
  tier?: number,
  specialization?: string,
  source: CharacterTraitSource = 'character',
  cost = 10,
): CharacterTrait => new CharacterTrait(traitId, traitId, true, tier, source === 'race' ? 0 : cost, specialization, source);

export const skill = (skillId: string, specialization: string | null = null, ranks = 0): CharacterSkill => {
  const result = CharacterSkill.empty(skillId, specialization, [], [2, 4], 0);
  result.ranks = ranks;
  return result;
};

export const buildCharacter = (
  props: {
    traits?: CharacterTrait[];
    skills?: CharacterSkill[];
    slots?: Record<string, string | null>;
    racialAt?: number;
    sizeId?: string;
    devPoints?: number;
    level?: number;
    bonusDevPoints?: number;
  } = {},
): Character => {
  const statistics = {} as Record<StatKey, CharacterStat>;
  STAT_KEYS.forEach(key => (statistics[key] = CharacterStat.fromModifiers(50, 50, {} as Record<string, number>)));
  const experience = CharacterXP.fromLevel(1, ['melee', 'ranged', 'shield', 'unarmed']);
  experience.availableDevPoints = props.devPoints ?? 60;
  experience.devPoints = 60;
  experience.level = props.level ?? 0;
  experience.availableLevel = 10;
  experience.availableBonusDevPoints = props.bonusDevPoints ?? 0;
  const defense = CharacterDefense.empty();
  defense.armor.racialAt = props.racialAt ?? 1;
  const equipment = CharacterEquipment.empty();
  equipment.slots = props.slots || {};
  return Character.fromProps({
    id: 'character-001',
    gameId: 'game-001',
    faction: new NamedEntity('faction-001', 'Faction'),
    name: 'Test',
    info: {
      race: new NamedEntity('race-001', 'Race'),
      professionId: 'fighter',
      sizeId: props.sizeId ?? 'medium',
      realmType: 'essence',
      height: 1.8,
      weight: 80,
    },
    roleplay: { gender: undefined, age: undefined },
    experience,
    statistics,
    movement: CharacterMovement.empty(),
    defense,
    resistances: [],
    hp: { max: 0, current: 0 },
    endurance: {} as CharacterEndurance,
    power: null,
    initiative: new CharacterInitiative({}),
    skills: props.skills || [],
    equipment,
    attacks: [],
    traits: props.traits || [],
    status: 'created',
    injuries: [],
    conditions: [],
    appliedTacticalGames: [],
    description: undefined,
    imageUrl: undefined,
    owner: 'user-001',
    createdAt: new Date(),
    updatedAt: undefined,
  });
};

export const weapon = (id: string, skillId: string, ranges: ItemWeaponRange[] | null = null): Item =>
  ({
    id,
    itemTypeId: 'weapon',
    info: { length: 1, weight: 1 },
    carried: true,
    weapon: new ItemWeapon(skillId, 3, [new ItemWeaponMode('one-hand', [ranges ? 'ranged' : 'melee'], 'table', 'fumble-table', 0, ranges)]),
    shield: null,
    armor: null,
  }) as unknown as Item;

export const shield = (id: string): Item =>
  ({
    id,
    itemTypeId: 'shield',
    info: { weight: 1 },
    carried: true,
    weapon: null,
    shield: { db: 20, blockCount: 1 },
    armor: null,
  }) as unknown as Item;

export const armor = (id: string, slot: string, at: number): Item =>
  ({
    id,
    itemTypeId: 'armor',
    info: { weight: 1 },
    carried: true,
    weapon: null,
    shield: null,
    armor: { slot, at, enc: 0, maneuverPenalty: 0, rangedPenalty: 0, perceptionPenalty: 0, baseDifficulty: 'routine' },
  }) as unknown as Item;
