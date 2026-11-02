import type { HealingTables } from '../../../../../src/modules/characters/domain/value-objects/healing-tables.vo.js';
import type { Injury, InjuryTreatment } from '../../../../../src/modules/characters/domain/value-objects/injury.vo.js';

const days = (base: number) => ({
  bone: base,
  'cut-burn': base + 1,
  'muscle-tendon': base + 2,
  organ: base + 3,
  'poison-disease': base + 4,
  'skin-tissue': base + 5,
});

/** Fixture tables with invented numbers: the rulebook values live only in the gitignored data directory. */
export const TABLES: HealingTables = {
  recoveryDays: [
    { min: null, max: 0, days: days(30) },
    { min: 1, max: 100, days: days(10) },
    { min: 101, max: null, days: days(2) },
  ],
  severityMultipliers: { light: 1, medium: 3, severe: 7 },
  headMultiplier: 2,
  severity: [
    { severity: 'light', maxPenalty: 10, maxBleeding: 2 },
    { severity: 'medium', maxPenalty: 30, maxBleeding: 5 },
    { severity: 'severe', maxPenalty: null, maxBleeding: null },
  ],
  healingTypeModifiers: { none: -90, medicine: 0, 'medicine-absolute': 15, 'magic-or-herbs': 40, 'magic-and-herbs': 60 },
  herbalismBonus: 20,
  permanentInjury: [
    { min: null, max: 0, result: 'absolute-failure', fraction: 1 },
    { min: 1, max: 100, result: 'failure', fraction: 0.6 },
    { min: 101, max: null, result: 'absolute-success', fraction: 0 },
  ],
  restHpPercentPerPeriod: 10,
  restPeriodHours: 2,
  fullRestDayMultiplier: 2,
  talentMultipliers: { 'fast-healer': 0.5, 'slow-healer': 2 },
};

/**
 * Workspace spec 068: invented rows of the spec 068 fields (cauterization bands, surgery, limits, salve range). The
 * rulebook values live only in the gitignored data directory.
 */
export const SPEC_068_TABLES: Partial<HealingTables> = {
  cauterization: [
    { min: null, max: 9, result: 'absolute-failure', bleeding: 'unchanged', heatSeverity: 'E', hitsDice: 3 },
    { min: 10, max: 49, result: 'failure', bleeding: 'halved', heatSeverity: 'C', hitsDice: 2 },
    { min: 50, max: 99, result: 'success', bleeding: 'stopped', heatSeverity: 'B', hitsDice: 1 },
    { min: 100, max: null, result: 'absolute-success', bleeding: 'stopped', heatSeverity: null, hitsDice: 0 },
  ],
  cauterizationUnusualRoll: 77,
  surgeryRequired: [{ injuryType: 'organ', severity: 'medium' }],
  treatmentLimits: {
    splint: { leg: { pace: 'jog' }, arm: { limbUnusable: true } },
    cast: { leg: { pace: 'creep', cane: 'walk', crutches: 'run' }, maneuverPenaltyFactor: 0.25 },
  },
  salveModifier: { min: -15, max: 35 },
};

export const treatment = (props: Partial<InjuryTreatment> = {}): InjuryTreatment => ({
  id: 'treatment-001',
  procedure: 'splint',
  healer: { name: 'Healer', bonus: 30 },
  difficulty: 0,
  roll: 80,
  total: 110,
  result: 'success',
  healingType: 'medicine',
  recoveryModifier: 0,
  at: '2026-10-21T00:00:00.000Z',
  context: 'strategic',
  ...props,
});

export const injury = (props: Partial<Injury> = {}): Injury => ({
  id: 'injury-001',
  type: 'bone',
  severity: 'light',
  penalty: -10,
  initialPenalty: -10,
  source: { kind: 'manual' },
  treatments: [],
  status: 'active',
  createdAt: '2026-10-20T00:00:00.000Z',
  ...props,
});
