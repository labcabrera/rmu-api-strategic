import type { RealmClientPort, RealmResponse } from '../../../src/modules/games/application/ports/realm-client.port.js';
import type { ItemClientPort, ItemResponse } from '../../../src/modules/items/application/ports/item-client.port.js';
import type { Race, RaceClientPort } from '../../../src/modules/characters/application/ports/race-client.port.js';
import type { SkillClientPort, SkillResponse } from '../../../src/modules/characters/application/ports/skill-client.port.js';
import type {
  SkillCategoryClientPort,
  SkillCategoryResponse,
} from '../../../src/modules/characters/application/ports/skill-category-client.port.js';
import type { Profession, ProfessionClientPort } from '../../../src/modules/characters/application/ports/profession-client.port.js';
import type { TraitClientPort, TraitResponse } from '../../../src/modules/characters/application/ports/trait-client.port.js';
import type { Culture, CultureClientPort } from '../../../src/modules/characters/application/ports/culture-client.port.js';
import type { HealingTables } from '../../../src/modules/characters/domain/value-objects/healing-tables.vo.js';
import type { FightingStylesClientPort } from '../../../src/modules/characters/application/ports/fighting-styles-client.port.js';
import type { FightingStyleCatalog } from '../../../src/modules/characters/domain/value-objects/fighting-styles.vo.js';
import type { HealingTablesClientPort } from '../../../src/modules/characters/application/ports/healing-tables-client.port.js';
import type { PoisonRulesClientPort } from '../../../src/modules/characters/application/ports/poison-rules-client.port.js';
import type {
  AbsoluteManeuverResponse,
  ManeuverClientPort,
} from '../../../src/modules/characters/application/ports/maneuver-client.port.js';
import type { DomainEventPublisher } from '../../../src/modules/shared/application/ports/domain-event-publisher.port.js';
import type { BaseAggregateRoot } from '../../../src/modules/shared/domain/aggregates/base-aggregate.js';
import type { DomainEvent } from '../../../src/modules/shared/domain/events/domain-event.js';
import { NotFoundError } from '../../../src/modules/shared/domain/errors/errors.js';
import type { SpellListClientPort, SpellResponse } from '../../../src/modules/characters/application/ports/spell-list-client.port.js';
import type { SpellListInfo } from '../../../src/modules/characters/domain/services/spells/spell-list-rules.js';
import { TABLES } from '../../unit/domain/characters/healing/healing.fixture.js';

// Invented catalog data (not book data): the minimum the strategic API reads from core and items.

export const REALM: RealmResponse = { id: 'realm-001', name: 'E2E realm' };

export const SKILLS: SkillResponse[] = [
  { id: 'body-development', categoryId: 'physical', bonus: ['co'], specialization: undefined },
  { id: 'perception', categoryId: 'awareness', bonus: ['in'], specialization: undefined },
  { id: 'jumping', categoryId: 'athletic', bonus: ['ag'], specialization: undefined },
  { id: 'melee-weapon', categoryId: 'combat', bonus: ['st'], specialization: 'weapon' },
  { id: 'power-development', categoryId: 'power-manipulation', bonus: ['co'], specialization: undefined },
  // Workspace spec 032: a fighting style skill, without stat bonus
  { id: 'combat-styles', categoryId: 'combat-expertise', bonus: [], specialization: 'combat-style' },
  ...['base', 'open', 'closed', 'arcane', 'restricted'].map(type => ({
    id: `${type}-spell-list`,
    categoryId: 'spellcasting',
    bonus: ['me'],
    specialization: 'spell-list',
  })),
];

export const SKILL_CATEGORIES: SkillCategoryResponse[] = [
  ...['physical', 'awareness', 'athletic', 'combat', 'combat-expertise'].map(id => ({ id, bonus: [] })),
  // Spec 029: the realm stat counts twice (R*+R*)
  ...['spellcasting', 'power-manipulation'].map(id => ({ id, bonus: [], realmBonus: 2 })),
];

export const PROFESSION: Profession = {
  id: 'fighter',
  professionalSkills: [],
  skillCosts: { physical: [2, 6], awareness: [2, 4], athletic: [2, 5], combat1: [2, 5], combat4: [4, 8], 'combat-expertise': [1, 1] },
};

/** Made-up fighting styles with the shape of rmu-api-core (spec 032), not the rulebook ones. */
export const FIGHTING_STYLES: FightingStyleCatalog = {
  styles: [
    {
      id: 'e2e-style',
      skillId: 'combat-styles',
      abilities: [
        { abilityId: 'e2e-basic', cost: 2 },
        { abilityId: 'e2e-advanced', cost: 1 },
        { abilityId: 'e2e-repeatable', cost: 1 },
      ],
      requiresSkills: [],
      requiresTraits: [],
    },
  ],
  abilities: [
    { id: 'e2e-basic', repeatable: false, maxTimes: null, requiresAbilities: [], requiresSkills: [], requiresTraits: [] },
    { id: 'e2e-advanced', repeatable: false, maxTimes: null, requiresAbilities: ['e2e-basic'], requiresSkills: [], requiresTraits: [] },
    { id: 'e2e-repeatable', repeatable: true, maxTimes: 2, requiresAbilities: [], requiresSkills: [], requiresTraits: [] },
  ],
};

/** A pure spellcaster of essence, with invented costs. */
export const MAGICIAN: Profession = {
  id: 'magician',
  professionalSkills: [],
  fixedRealmTypes: ['essence'],
  availableRealmTypes: [],
  skillCosts: {
    physical: [2, 6],
    awareness: [2, 4],
    'spells-base-open': [1, 2],
    'spells-closed': [2, 4],
    'spells-restricted': [6, 8],
    'power-manipulation': [2, 3],
  },
};

/** Invented spell lists and spells of rmu-api-spells (not book data). */
export const SPELL_LISTS: SpellListInfo[] = [
  { id: 'list-base', code: 'e2e-base', name: 'E2E base', realms: ['essence'], type: 'base', professionId: 'magician' },
  { id: 'list-other-base', code: 'e2e-other-base', name: 'E2E other base', realms: ['essence'], type: 'base', professionId: 'illusionist' },
  { id: 'list-open', code: 'e2e-open', name: 'E2E open', realms: ['essence'], type: 'open', professionId: null },
  { id: 'list-evil', code: 'e2e-evil', name: 'E2E evil', realms: ['essence'], type: 'evil', professionId: null },
  { id: 'list-channeling', code: 'e2e-channeling', name: 'E2E channeling', realms: ['channeling'], type: 'open', professionId: null },
];

export const SPELLS: SpellResponse[] = [1, 2, 3].map(level => ({
  id: `spell-base-${level}`,
  spellListId: 'list-base',
  name: `E2E spell ${level}`,
  level,
  modifiers: { powerPoints: level === 2 ? 0 : null },
  effects: [],
}));

export const RACE = {
  id: 'race-001',
  name: 'E2E race',
  sizeId: 'medium',
  baseHits: 20,
  baseDevPoints: 50,
  baseAt: 1,
  stats: {},
  resistances: {},
  traits: [],
  skillBonuses: [],
} as unknown as Race;

export const CULTURE = { id: 'culture-001', name: 'E2E culture', languages: [], skillRanks: [] } as unknown as Culture;

function armorType(id: string, armor: Partial<NonNullable<ItemResponse['armor']>>): ItemResponse {
  return {
    id,
    category: 'armor',
    weapon: null,
    armor: { rangedPenalty: 0, perceptionPenalty: 0, baseDifficulty: 'm', ...armor } as ItemResponse['armor'],
    shield: null,
    info: { cost: { min: 5, average: 5, max: 5 }, length: null, strength: 50, weight: 10, productionHours: 40, stackable: false },
  };
}

export const ITEM_TYPES: Record<string, ItemResponse> = {
  stone: {
    id: 'stone',
    category: 'equipment',
    weapon: null,
    armor: null,
    shield: null,
    info: { cost: null, length: null, strength: null, weight: 1, productionHours: undefined, stackable: false },
  },
  rope: {
    id: 'rope',
    category: 'equipment',
    weapon: null,
    armor: null,
    shield: null,
    info: { cost: { min: 1, average: 2, max: 3 }, length: 10, strength: null, weight: 1, productionHours: undefined, stackable: false },
  },
  sword: {
    id: 'sword',
    name: 'E2E sword',
    category: 'weapon',
    weapon: {
      skillId: 'melee-weapon',
      fumble: 3,
      modes: [{ type: 'one-hand', attackTypes: ['slash'], attackTable: 'e2e-table', fumbleTable: 'e2e-fumble', sizeAdjustment: 0 }],
    } as unknown as ItemResponse['weapon'],
    armor: null,
    shield: null,
    info: {
      cost: { min: 8, average: 10, max: 12 },
      length: 1,
      strength: 20,
      weight: 3,
      productionHours: 40,
      stackable: false,
      rarity: 'common',
    },
    modifiers: [{ type: 'bonus', value: 5 }],
    imageUrl: 'images/items/sword.png',
  },
  // A sword that can be equipped: the attacks need the `<skill>@<specialization>` form (spec 024)
  longsword: {
    id: 'longsword',
    name: 'E2E longsword',
    category: 'weapon',
    weapon: {
      skillId: 'melee-weapon@sword',
      fumble: 3,
      modes: [{ type: 'one-hand', attackTypes: ['slash'], attackTable: 'e2e-table', fumbleTable: 'e2e-fumble', sizeAdjustment: 0 }],
    } as unknown as ItemResponse['weapon'],
    armor: null,
    shield: null,
    info: { cost: { min: 8, average: 10, max: 12 }, length: 1, strength: 20, weight: 3, productionHours: 40, stackable: false },
    modifiers: [{ type: 'bonus', value: 5 }],
  },
  arrow: {
    id: 'arrow',
    category: 'ammunition',
    weapon: null,
    armor: null,
    shield: null,
    info: { cost: { min: 0.1, average: 0.1, max: 0.1 }, length: null, strength: 5, weight: 0.1, productionHours: 1, stackable: true },
  },
  // Workspace spec 041: a full suit, light/heavy pieces, two torsos and a tool used as an improvised weapon (invented data)
  'e2e-suit': armorType('e2e-suit', { slot: 'body', at: 8, enc: 20, maneuverPenalty: -60, coverage: ['body', 'head', 'arms', 'legs'] }),
  'e2e-heavy-helmet': armorType('e2e-heavy-helmet', { slot: 'head', at: 9, enc: 3, maneuverPenalty: -5, class: 'heavy' }),
  'e2e-light-greaves': armorType('e2e-light-greaves', { slot: 'legs', at: 3, enc: 2, maneuverPenalty: -5, class: 'light' }),
  'e2e-plate-torso': armorType('e2e-plate-torso', { slot: 'body', at: 10, enc: 10, maneuverPenalty: -40 }),
  'e2e-leather-torso': armorType('e2e-leather-torso', { slot: 'body', at: 3, enc: 3, maneuverPenalty: -5 }),
  'e2e-chisel': {
    id: 'e2e-chisel',
    category: 'tools',
    weapon: {
      skillId: 'melee-weapon@sword',
      fumble: 3,
      tags: ['improvised'],
      modes: [
        {
          type: 'one-hand',
          attackTypes: ['melee'],
          attackTable: 'e2e-table',
          fumbleTable: 'e2e-fumble',
          sizeAdjustment: -1,
          obModifier: -40,
        },
      ],
    } as unknown as ItemResponse['weapon'],
    armor: null,
    shield: null,
    info: { cost: { min: 1, average: 1, max: 1 }, length: null, strength: 50, weight: 1, productionHours: 8, stackable: false },
  },
  'e2e-lantern': {
    id: 'e2e-lantern',
    category: 'light',
    weapon: null,
    armor: null,
    shield: null,
    features: { light: { radius: 20, durationHours: 5 } },
    info: {
      cost: { min: 1, average: 1, max: 1 },
      length: null,
      strength: null,
      weight: 1,
      productionHours: 8,
      stackable: false,
      lotSize: 2,
    },
  },
  // Workspace spec 042: a paste poison and an antidote (invented data)
  'e2e-venom': {
    id: 'e2e-venom',
    name: 'E2E venom',
    category: 'poison',
    weapon: null,
    armor: null,
    shield: null,
    features: { poison: { category: 'muscle', level: 4, form: 'paste', maxSeverity: null, immediateHits: null, onsetRounds: null } },
    info: { cost: { min: 1, average: 1, max: 1 }, length: null, strength: null, weight: 0.01, productionHours: 1, stackable: true },
  },
  'e2e-cure': {
    id: 'e2e-cure',
    name: 'E2E cure',
    category: 'herb',
    weapon: null,
    armor: null,
    shield: null,
    features: { antidote: { categories: ['muscle'], level: 5, withinHours: null } },
    info: { cost: { min: 1, average: 1, max: 1 }, length: null, strength: null, weight: 0.01, productionHours: 1, stackable: true },
  },
  'gold-coin': {
    id: 'gold-coin',
    category: 'currency',
    weapon: null,
    armor: null,
    shield: null,
    info: { cost: null, length: null, strength: null, weight: 0.01, productionHours: undefined, stackable: true },
  },
};

/**
 * GET /v1/healing-tables of core: the unit fixture plus invented treatment difficulties in the shape of spec 022
 * (`treatmentDifficulties` and `treatmentRules`).
 */
export const CORE_HEALING_TABLES: HealingTables = {
  ...TABLES,
  treatmentDifficulties: [
    { procedure: 'dress', injuryType: 'skin-tissue', severity: 'light', difficulty: 'r' },
    { procedure: 'splint', injuryType: 'bone', severity: 'light', difficulty: 'e' },
    { procedure: 'splint', injuryType: 'bone', severity: 'medium', difficulty: 'e' },
    { procedure: 'stitches', injuryType: 'cut-burn', severity: 'medium', difficulty: 'm' },
    { procedure: 'pressure', injuryType: 'cut-burn', severity: 'severe', difficulty: 'e' },
    { procedure: 'cauterize', injuryType: 'cut-burn', severity: 'severe', difficulty: 'r' },
    { procedure: 'cauterize', injuryType: 'cut-burn', severity: 'medium', difficulty: 'r' },
  ],
  treatmentRules: {
    headDifficultySteps: 1,
    cauterizePenaltyPerBleeding: -5,
    bleedingProcedures: ['pressure', 'stitches', 'tourniquet', 'cauterize'],
    tourniquetLocations: ['arm', 'leg'],
  },
};

/** Results the fake medical maneuver table answers, in order (then success), and the totals it got. */
export const maneuverCalls: { results: AbsoluteManeuverResponse['result'][]; totals: number[]; tables: string[] } = {
  results: [],
  totals: [],
  tables: [],
};

/** Every outbound API port of strategic, answered from the data above. */
export function apiFakes() {
  const realmClient: RealmClientPort = { getRealmById: id => Promise.resolve(id === REALM.id ? REALM : undefined) };
  const itemClient: ItemClientPort = {
    getItemById: id => Promise.resolve(ITEM_TYPES[id]),
  };
  const raceClient: RaceClientPort = {
    getRaceById: id => (id === RACE.id ? Promise.resolve(RACE) : Promise.reject(new Error(`race ${id}`))),
  };
  const skillClient: SkillClientPort = {
    getAllSkills: () => Promise.resolve({ content: SKILLS, pagination: { page: 0, size: 1000, totalElements: SKILLS.length } } as never),
    getSkillById: id => Promise.resolve(SKILLS.find(skill => skill.id === id)!),
  };
  const skillCategoryClient: SkillCategoryClientPort = {
    getAllSkillCategories: () => Promise.resolve(SKILL_CATEGORIES),
    getSkillCategoryById: (id: string) => Promise.resolve(SKILL_CATEGORIES.find(category => category.id === id)!),
  };
  const professionClient: ProfessionClientPort = {
    getProfessionById: id => Promise.resolve(id === MAGICIAN.id ? MAGICIAN : PROFESSION),
  };
  const spellListClient: SpellListClientPort = {
    getSpellListByCode: code => Promise.resolve(SPELL_LISTS.find(list => list.code === code)),
    getSpellsByListId: id => Promise.resolve(SPELLS.filter(spell => spell.spellListId === id)),
  };
  const traitClient: TraitClientPort = {
    getTraitById: (id: string) => Promise.reject<TraitResponse>(new NotFoundError('Trait', id)),
  };
  const cultureClient: CultureClientPort = {
    getCultureById: id => (id === CULTURE.id ? Promise.resolve(CULTURE) : Promise.reject(new NotFoundError('Culture', id))),
  };
  const healingTablesClient: HealingTablesClientPort = { getHealingTables: () => Promise.resolve(CORE_HEALING_TABLES) };
  const fightingStylesClient: FightingStylesClientPort = { getFightingStyles: () => Promise.resolve(FIGHTING_STYLES) };
  // Workspace spec 042: invented RR rules (required 50, -2 per level) and a muscle row per severity, each a round later
  const poisonRulesClient: PoisonRulesClientPort = {
    getRrRules: () =>
      Promise.resolve({
        requiredTotal: 50,
        attackLevelMultiplier: -2,
        bands: [
          { min: 1, max: 20, severity: 'mild' },
          { min: 21, max: 40, severity: 'moderate' },
          { min: 41, max: 80, severity: 'severe' },
          { min: 81, max: null, severity: 'extreme' },
        ],
      }),
    getPoisonTables: () =>
      Promise.resolve({
        rows: (['mild', 'moderate', 'severe', 'extreme'] as const).map((severity, i) => ({
          category: 'muscle' as const,
          severity,
          start: { min: i, max: i, unit: 'round' as const },
          duration: { min: 2, max: 2, unit: 'hour' as const },
          penalty: { min: -5 * (i + 1), max: -5 * (i + 1) },
          hitsPerRound: null,
          hitsRounds: null,
          condition: severity === 'extreme' ? ('dead' as const) : null,
          conditionDelay: null,
          conditionDuration: null,
          permanent: false,
        })),
      }),
  };
  const maneuverClient: ManeuverClientPort = {
    absolute: (total: number, table: string) => {
      maneuverCalls.totals.push(total);
      maneuverCalls.tables.push(table);
      const result = maneuverCalls.results.shift() ?? 'success';
      const effects =
        table === 'crafting'
          ? result === 'absolute-success'
            ? [{ status: 'itemBreakage', value: 10 }]
            : result === 'partial-success'
              ? [{ status: 'itemBreakage', value: -10 }]
              : []
          : result === 'absolute-failure'
            ? [{ status: 'injuryPenalty', value: 10 }]
            : [];
      return Promise.resolve<AbsoluteManeuverResponse>({ result, message: result, effects });
    },
    // Invented percent table: the total itself, between 0 and 150
    percent: (total: number) => {
      maneuverCalls.totals.push(total);
      return Promise.resolve({ percent: Math.max(0, Math.min(150, total)), message: 'percent' });
    },
  };
  return {
    realmClient,
    itemClient,
    raceClient,
    skillClient,
    skillCategoryClient,
    professionClient,
    traitClient,
    cultureClient,
    healingTablesClient,
    fightingStylesClient,
    poisonRulesClient,
    maneuverClient,
    spellListClient,
  };
}

/** The DomainEventPublisher of the suite: keeps the topics and messages Kafka would get. */
export class InMemoryEventPublisher implements DomainEventPublisher {
  readonly published: { topic: string; event: DomainEvent<unknown> }[] = [];

  publish(aggregateType: string, ...events: DomainEvent<unknown>[]): Promise<void> {
    for (const event of events) this.published.push({ topic: `internal.rmu-strategic.${aggregateType}.${event.eventType}.v1`, event });
    return Promise.resolve();
  }

  publishChanges(aggregateType: string, aggregate: BaseAggregateRoot<{ id: string }>): Promise<void> {
    const events = [...aggregate.getUncommittedEvents()];
    aggregate.uncommit();
    return this.publish(aggregateType, ...events);
  }

  topics(): string[] {
    return this.published.map(entry => entry.topic);
  }

  clear(): void {
    this.published.length = 0;
  }
}
