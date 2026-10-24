import { HealingTables } from '../../../../../src/modules/characters/domain/value-objects/healing-tables.vo';
import { Injury, InjuryTreatment } from '../../../../../src/modules/characters/domain/value-objects/injury.vo';

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
