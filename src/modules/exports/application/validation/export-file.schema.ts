import Joi from 'joi';
import { REALM_STAT_TOKEN } from '../../../characters/domain/value-objects/character-realm.vo.js';
import { CHARACTER_CONDITION_STATUSES } from '../../../characters/domain/value-objects/character-condition.vo.js';
import { STAT_KEYS } from '../../../characters/domain/value-objects/character-stat.vo.js';
import {
  BLEEDING_CONTROLS,
  BODY_LOCATIONS,
  BODY_SIDES,
  HEALING_TYPES,
  INJURY_FLAGS,
  INJURY_SEVERITIES,
  INJURY_SOURCE_KINDS,
  INJURY_STATUSES,
  INJURY_TYPES,
  TREATMENT_PROCEDURES,
  TREATMENT_RESULTS,
} from '../../../characters/domain/value-objects/injury.vo.js';
import { ITEM_MODIFIER_TARGETS, ITEM_MODIFIER_TYPES } from '../../../items/domain/value-objects/item-modifier.vo.js';
import { CURRENT_FORMAT_VERSION, EXPORT_FORMAT, MAX_IMPORT_CHARACTERS, MAX_IMPORT_ITEMS } from '../../domain/format/export-format.js';

/**
 * Schema of the current format (workspace spec 024, decision 11): applied after the upcasters, it checks every field
 * of the file, which is never trusted. Unknown fields are dropped. test/fixtures/exports/schema-v<N>.json keeps a
 * snapshot of its description: changing it without raising CURRENT_FORMAT_VERSION fails a test.
 */

const ID = 200;
const NAME = 200;
const TEXT = 20_000;

const id = () => Joi.string().trim().min(1).max(ID);
const name = () => Joi.string().trim().min(1).max(NAME);
const text = () => Joi.string().max(TEXT).allow('');
// Joi numbers already reject NaN and Infinity
const num = () => Joi.number();
const int = () => Joi.number().integer();
const date = () => Joi.string().isoDate();
const ref = (prefix: 'c' | 'i') => Joi.string().pattern(new RegExp(`^${prefix}[1-9][0-9]{0,5}$`));
const nullable = (schema: Joi.Schema) => schema.allow(null);

const SLOTS = ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'];
const SIZES = ['minuscule', 'diminutive', 'tiny', 'small', 'medium', 'big', 'large', 'huge', 'gigantic', 'enormous'];

const reference = Joi.object({ id: id().required(), name: nullable(name()).required() });

const injurySource = Joi.object({
  kind: Joi.string()
    .valid(...INJURY_SOURCE_KINDS)
    .required(),
  tacticalGameId: id(),
  tacticalGameName: name(),
  actionId: id(),
  round: int(),
  attackerId: id(),
  attackerName: name(),
  criticalKey: Joi.string().max(NAME),
  injuryId: id(),
});

const treatment = Joi.object({
  id: id().required(),
  procedure: Joi.string()
    .valid(...TREATMENT_PROCEDURES)
    .required(),
  healer: Joi.object({
    characterId: id(),
    actorId: id(),
    name: name().required(),
    external: Joi.boolean(),
    bonus: num().required(),
    penalty: num(),
  }).required(),
  difficulty: num().required(),
  difficultySource: Joi.string().valid('table', 'override'),
  roll: num().required(),
  total: num().required(),
  result: Joi.string()
    .valid(...TREATMENT_RESULTS)
    .required(),
  healingType: Joi.string()
    .valid(...HEALING_TYPES)
    .required(),
  recoveryModifier: num().required(),
  at: date().required(),
  context: Joi.string().valid('tactical', 'strategic').required(),
  tacticalGameId: id(),
  heatCritical: Joi.string().max(NAME),
});

const injury = Joi.object({
  id: id().required(),
  type: Joi.string()
    .valid(...INJURY_TYPES)
    .required(),
  severity: Joi.string()
    .valid(...INJURY_SEVERITIES)
    .required(),
  location: Joi.string().valid(...BODY_LOCATIONS),
  side: Joi.string().valid(...BODY_SIDES),
  penalty: num().max(0).required(),
  initialPenalty: num().max(0).required(),
  bleeding: num().min(0),
  bleedingControl: Joi.string().valid(...BLEEDING_CONTROLS),
  flags: Joi.array().items(Joi.string().valid(...INJURY_FLAGS)),
  description: text(),
  source: injurySource.required(),
  treatments: Joi.array().items(treatment).max(100).required(),
  recovery: Joi.object({
    roll: num().required(),
    modifiers: num().required(),
    total: num().required(),
    baseDays: num().min(0).required(),
    multiplier: num().min(0).required(),
    totalDays: num().min(0).required(),
    remainingDays: num().min(0).required(),
    startedAt: date().required(),
    treatmentId: id(),
    untreated: Joi.boolean(),
  }),
  permanent: Joi.object({ penalty: num().max(0).required(), roll: num() }),
  poison: Joi.object().max(20).unknown(true),
  status: Joi.string()
    .valid(...INJURY_STATUSES)
    .required(),
  createdAt: date().required(),
  updatedAt: date(),
  healedAt: date(),
});

const condition = Joi.object({
  id: id().required(),
  status: Joi.string()
    .valid(...CHARACTER_CONDITION_STATUSES)
    .required(),
  source: injurySource.required(),
  description: text(),
  createdAt: date().required(),
  resolvedAt: date(),
});

const character = Joi.object({
  name: name().required(),
  info: Joi.object({
    raceId: id().required(),
    raceName: name().required(),
    professionId: id().required(),
    sizeId: Joi.string()
      .valid(...SIZES)
      .required(),
    realmType: Joi.string().valid('channeling', 'essence', 'mentalism').required(),
    realmTypes: Joi.array()
      .items(Joi.string().valid('channeling', 'essence', 'mentalism'))
      .min(1)
      .max(2),
    height: num().min(0).required(),
    weight: num().min(0).required(),
    cultureId: nullable(id()).required(),
  }).required(),
  roleplay: Joi.object({
    gender: nullable(Joi.string().valid('male', 'female', 'other')).required(),
    age: nullable(num().min(0)).required(),
  }).required(),
  experience: Joi.object({
    level: int().min(0).max(1000).required(),
    availableLevel: int().min(0).max(1000).required(),
    xp: num().min(0).required(),
    devPoints: num().required(),
    availableDevPoints: num().required(),
    availableBonusDevPoints: num().required(),
    availableStatLevelUp: num().required(),
    developedStatLevelUp: num().required(),
    weaponDevelopment: Joi.array()
      .items(Joi.string().valid('melee', 'ranged', 'shield', 'unarmed'))
      .length(4)
      .required(),
    bonusDevPointsSpentThisLevel: num().required(),
    flawDevPoints: num().required(),
  }).required(),
  statistics: Joi.object(
    Object.fromEntries(
      STAT_KEYS.map(key => [
        key,
        Joi.object({ potential: num().min(0).max(200).required(), temporary: num().min(0).max(200).required() }).required(),
      ]),
    ),
  ).required(),
  skills: Joi.array()
    .items(
      Joi.object({
        skillId: id().required(),
        specialization: nullable(name()).required(),
        statistics: Joi.array()
          // The realm stat placeholder of Spellcasting and Power Manipulation (spec 029)
          .items(Joi.string().valid(...STAT_KEYS, REALM_STAT_TOKEN))
          .max(10)
          .required(),
        development: Joi.array().items(num()).max(10).required(),
        professional: nullable(Joi.array().items(Joi.string().valid('professional', 'knack')).max(2)).required(),
        ranks: int().min(0).max(1000).required(),
        ranksDeveloped: int().min(0).max(10).required(),
        cultureRanks: int().min(0).max(1000).required(),
        devPointsSpent: Joi.object({ normal: num().required(), bonus: num().required() }).required(),
        knackBonus: nullable(num()).required(),
        styleAbilities: Joi.array()
          .items(
            Joi.object({ abilityId: id().required(), times: int().min(1).max(100).required(), cost: int().min(0).max(100).required() }),
          )
          .max(200),
      }),
    )
    .max(1000)
    .required(),
  traits: Joi.array()
    .items(
      Joi.object({
        traitId: id().required(),
        traitName: name().required(),
        isTalent: Joi.boolean().required(),
        tier: nullable(int().min(0)).required(),
        cost: num().required(),
        specialization: nullable(name()).required(),
        paidWith: nullable(
          Joi.object({
            normal: num().required(),
            bonus: num().required(),
            flaw: num().required(),
            cappedBonus: num().required(),
            level: int().min(0).required(),
          }),
        ).required(),
      }),
    )
    .max(500)
    .required(),
  hp: Joi.object({ current: num().required() }).required(),
  endurance: Joi.object({
    base: num().required(),
    customBonus: num().required(),
    max: num().required(),
    current: num().required(),
    accumulator: num().required(),
    fatiguePenalty: num().required(),
  }).required(),
  power: nullable(Joi.object({ current: num().required() })).required(),
  resistances: Joi.array()
    .items(Joi.object({ resistance: id().required(), customBonus: num().required() }))
    .max(50)
    .required(),
  equipment: Joi.object({
    slots: Joi.object(Object.fromEntries(SLOTS.map(slot => [slot, nullable(ref('i'))]))).required(),
  }).required(),
  status: Joi.string().valid('partially_created', 'created', 'dead').required(),
  injuries: Joi.array().items(injury).max(500).required(),
  conditions: Joi.array().items(condition).max(500).required(),
  description: nullable(text()).required(),
  imageUrl: nullable(Joi.string().max(2000)).required(),
});

const modifier = Joi.object({
  id: id().required(),
  type: Joi.string()
    .valid(...ITEM_MODIFIER_TYPES)
    .required(),
  value: num().required(),
  appliesTo: Joi.string()
    .valid(...ITEM_MODIFIER_TARGETS)
    .required(),
  broken: Joi.boolean(),
  source: Joi.object({
    kind: Joi.string().valid('tactical', 'manual', 'crafting', 'repair', 'catalog').required(),
    tacticalGameId: id(),
    tacticalGameName: name(),
    round: int(),
    actionId: id(),
    crafterRef: ref('c'),
    crafterName: name(),
  }),
  description: text(),
  condition: text(),
  createdAt: date().required(),
});

const item = Joi.object({
  ref: ref('i').required(),
  itemTypeId: id().required(),
  name: name().required(),
  category: id().required(),
  carried: Joi.boolean().required(),
  weapon: nullable(
    Joi.object({
      skillId: id().required(),
      fumble: num().required(),
      modes: Joi.array()
        .items(
          Joi.object({
            type: id().required(),
            attackTypes: Joi.array().items(id()).max(20).required(),
            attackTable: id().required(),
            fumbleTable: id().required(),
            sizeAdjustment: num().required(),
            ranges: nullable(
              Joi.array()
                .items(Joi.object({ from: num().required(), to: num().required(), bonus: num().required() }))
                .max(20),
            ).required(),
            obModifier: num(),
          }),
        )
        .max(10)
        .required(),
      wielderSize: Joi.string().valid('small', 'medium', 'big'),
      tags: Joi.array().items(id()).max(20),
    }),
  ).required(),
  armor: nullable(
    Joi.object({
      slot: id().required(),
      at: num().required(),
      enc: num().required(),
      maneuverPenalty: num().required(),
      rangedPenalty: num().required(),
      perceptionPenalty: num().required(),
      baseDifficulty: id().required(),
      coverage: Joi.array().items(id()).max(4),
      class: Joi.string().valid('light', 'medium', 'heavy'),
    }),
  ).required(),
  shield: nullable(Joi.object({ db: num().required(), blockCount: num().required() })).required(),
  info: Joi.object({
    length: nullable(num()).required(),
    weight: num().min(0).required(),
    strength: nullable(num()).required(),
    stackable: Joi.boolean().required(),
  }).required(),
  amount: nullable(num().greater(0)).required(),
  description: nullable(text()).required(),
  catalog: nullable(
    Joi.object({
      cost: nullable(
        Joi.object({
          min: nullable(num().min(0)).required(),
          average: nullable(num().min(0)).required(),
          max: nullable(num().min(0)).required(),
        }),
      ).required(),
      rarity: nullable(id()).required(),
      productionHours: nullable(num().min(0)).required(),
      imageUrl: nullable(Joi.string().max(2000)).required(),
      lotSize: nullable(num().integer().min(1)),
      features: nullable(Joi.object().max(10).unknown(true)),
    }),
  ).required(),
  value: nullable(num().min(0)).required(),
  acquiredPrice: nullable(num().min(0)).required(),
  unrepairable: Joi.boolean().required(),
  coating: nullable(Joi.object().max(10).unknown(true)),
  material: nullable(
    Joi.object({
      id: id().required(),
      bonus: num().required(),
      durability: num().required(),
      magical: Joi.boolean().required(),
    }),
  ),
  modifiers: Joi.array().items(modifier).max(200).required(),
});

const characterEntry = Joi.object({
  ref: ref('c').required(),
  character: character.required(),
  items: Joi.array().items(item).max(MAX_IMPORT_ITEMS).required(),
});

const faction = Joi.object({
  name: name().required(),
  shortDescription: nullable(text()).required(),
  description: nullable(text()).required(),
  imageUrl: nullable(Joi.string().max(2000)).required(),
  management: Joi.object({ availableGold: num().min(0).required() }).required(),
});

export const exportFileSchema = Joi.object({
  format: Joi.string().valid(EXPORT_FORMAT).required(),
  formatVersion: Joi.number().valid(CURRENT_FORMAT_VERSION).required(),
  kind: Joi.string().valid('character', 'faction').required(),
  exportedAt: date().required(),
  source: Joi.object({
    app: name().required(),
    appVersion: Joi.string().max(50).required(),
    gameId: id().required(),
    gameName: name().required(),
    realmId: nullable(id()).required(),
    realmName: nullable(name()).required(),
    factionId: id().required(),
    factionName: name().required(),
    owner: nullable(id()).required(),
  }).required(),
  references: Joi.object({
    races: Joi.array().items(reference).required(),
    professions: Joi.array().items(reference).required(),
    cultures: Joi.array().items(reference).required(),
    skills: Joi.array().items(reference).required(),
    traits: Joi.array().items(reference).required(),
    itemTypes: Joi.array().items(reference).required(),
  }).required(),
  data: Joi.alternatives()
    .conditional('kind', {
      is: 'character',
      then: characterEntry,
      otherwise: Joi.object({
        faction: faction.required(),
        armory: Joi.array().items(item).max(MAX_IMPORT_ITEMS).required(),
        characters: Joi.array().items(characterEntry).max(MAX_IMPORT_CHARACTERS).required(),
      }),
    })
    .required(),
});

/** A failure of the file at a JSON path, like `data.character.injuries[0].type`. */
export interface ExportFileIssue {
  path: string;
  message: string;
}

export function validateExportFile(file: unknown): { value: unknown; issues: ExportFileIssue[] } {
  const result: Joi.ValidationResult<unknown> = exportFileSchema.validate(file, { abortEarly: false, stripUnknown: true, convert: false });
  const value: unknown = result.value;
  const error = result.error;
  const issues = (error?.details ?? []).slice(0, 100).map(detail => ({ path: toPath(detail.path), message: detail.message }));
  return { value, issues };
}

function toPath(path: (string | number)[]): string {
  return path.map((part, index) => (typeof part === 'number' ? `[${part}]` : index === 0 ? part : `.${part}`)).join('');
}
