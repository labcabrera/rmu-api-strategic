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
import type { HealingTablesClientPort } from '../../../src/modules/characters/application/ports/healing-tables-client.port.js';
import type {
  AbsoluteManeuverResponse,
  ManeuverClientPort,
} from '../../../src/modules/characters/application/ports/maneuver-client.port.js';
import type { DomainEventPublisher } from '../../../src/modules/shared/application/ports/domain-event-publisher.port.js';
import type { BaseAggregateRoot } from '../../../src/modules/shared/domain/aggregates/base-aggregate.js';
import type { DomainEvent } from '../../../src/modules/shared/domain/events/domain-event.js';
import { NotFoundError } from '../../../src/modules/shared/domain/errors/errors.js';
import { TABLES } from '../../unit/domain/characters/healing/healing.fixture.js';

// Invented catalog data (not book data): the minimum the strategic API reads from core and items.

export const REALM: RealmResponse = { id: 'realm-001', name: 'E2E realm' };

export const SKILLS: SkillResponse[] = [
  { id: 'body-development', categoryId: 'physical', bonus: ['co'], specialization: undefined },
  { id: 'perception', categoryId: 'awareness', bonus: ['in'], specialization: undefined },
  { id: 'jumping', categoryId: 'athletic', bonus: ['ag'], specialization: undefined },
  { id: 'melee-weapon', categoryId: 'combat', bonus: ['st'], specialization: 'weapon' },
];

export const SKILL_CATEGORIES: SkillCategoryResponse[] = ['physical', 'awareness', 'athletic', 'combat'].map(id => ({ id, bonus: [] }));

export const PROFESSION: Profession = {
  id: 'fighter',
  professionalSkills: [],
  skillCosts: { physical: [2, 6], awareness: [2, 4], athletic: [2, 5], combat1: [2, 5], combat4: [4, 8] },
};

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
  const professionClient: ProfessionClientPort = { getProfessionById: () => Promise.resolve(PROFESSION) };
  const traitClient: TraitClientPort = {
    getTraitById: (id: string) => Promise.reject<TraitResponse>(new NotFoundError('Trait', id)),
  };
  const cultureClient: CultureClientPort = {
    getCultureById: id => (id === CULTURE.id ? Promise.resolve(CULTURE) : Promise.reject(new NotFoundError('Culture', id))),
  };
  const healingTablesClient: HealingTablesClientPort = { getHealingTables: () => Promise.resolve(CORE_HEALING_TABLES) };
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
    maneuverClient,
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
