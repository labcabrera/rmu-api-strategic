import { InjuryTreatmentRules } from '../../../../../src/modules/characters/domain/services/healing/injury-treatment-rules.js';
import type { HealingTables } from '../../../../../src/modules/characters/domain/value-objects/healing-tables.vo.js';
import { injury, SPEC_068_TABLES, TABLES, treatment } from './healing.fixture.js';

const WITH_068: HealingTables = { ...TABLES, ...SPEC_068_TABLES };

/** Invented rows: the rulebook difficulties live only in the gitignored data directory. */
const WITH_DIFFICULTIES: HealingTables = {
  ...TABLES,
  treatmentDifficulties: [
    { procedure: 'dress', injuryType: 'skin-tissue', severity: 'light', difficulty: 'r' },
    { procedure: 'dress', injuryType: 'organ', severity: 'light', difficulty: 'vh' },
    { procedure: 'surgery', injuryType: 'organ', severity: 'severe', difficulty: 'a' },
    { procedure: 'surgery', injuryType: 'bone', severity: 'severe', difficulty: 'ni' },
    { procedure: 'cauterize', injuryType: 'bone', severity: 'light', difficulty: 'r' },
    { procedure: 'salve', injuryType: 'bone', severity: 'light', difficulty: 'nonsense' as never },
  ],
  treatmentRules: {
    headDifficultySteps: 2,
    cauterizePenaltyPerBleeding: -4,
    bleedingProcedures: ['pressure', 'stitches', 'tourniquet', 'cauterize'],
    tourniquetLocations: ['arm', 'leg', 'head'],
  },
};

describe('InjuryTreatmentRules', () => {
  describe('difficulty (D4/D5)', () => {
    it('takes the row of the procedure, injury type and severity', () => {
      expect(InjuryTreatmentRules.difficulty('dress', injury({ type: 'skin-tissue' }), WITH_DIFFICULTIES)).toEqual({
        procedure: 'dress',
        grade: 'r',
        headSteps: 0,
        base: 30,
        bleedingModifier: 0,
        difficulty: 30,
        matched: true,
        applicable: true,
      });
      expect(InjuryTreatmentRules.difficulty('dress', injury({ type: 'organ' }), WITH_DIFFICULTIES)).toMatchObject({ grade: 'vh' });
      expect(InjuryTreatmentRules.difficulty('surgery', injury({ type: 'organ', severity: 'severe' }), WITH_DIFFICULTIES)).toMatchObject({
        grade: 'a',
        difficulty: -70,
      });
    });

    it('a procedure without a row does not apply', () => {
      expect(InjuryTreatmentRules.difficulty('dress', injury({ type: 'bone' }), WITH_DIFFICULTIES)).toMatchObject({
        matched: false,
        applicable: false,
        grade: 'm',
      });
      expect(InjuryTreatmentRules.difficulty('salve', injury(), WITH_DIFFICULTIES)).toMatchObject({ grade: 'm', applicable: true });
    });

    it('uses the head steps and the cauterize modifier of core, up to the hardest difficulty', () => {
      expect(InjuryTreatmentRules.difficulty('dress', injury({ type: 'skin-tissue', location: 'head' }), WITH_DIFFICULTIES)).toMatchObject({
        grade: 'l',
        headSteps: 2,
        difficulty: 10,
      });
      const severeHead = injury({ type: 'bone', severity: 'severe', location: 'head' });
      expect(InjuryTreatmentRules.difficulty('surgery', severeHead, WITH_DIFFICULTIES).grade).toBe('ni');
      expect(InjuryTreatmentRules.difficulty('cauterize', injury({ bleeding: 4 }), WITH_DIFFICULTIES)).toMatchObject({
        base: 30,
        bleedingModifier: -16,
        difficulty: 14,
      });
      expect(InjuryTreatmentRules.difficulty('cauterize', injury(), WITH_DIFFICULTIES).bleedingModifier).toBe(0);
    });

    it('without a core table (old documents): medium, the default rules and every procedure applies', () => {
      const empty = { ...TABLES, treatmentDifficulties: [], treatmentRules: WITH_DIFFICULTIES.treatmentRules };
      expect(InjuryTreatmentRules.difficulty('dress', injury({ location: 'head' }), empty)).toMatchObject({
        grade: 'h',
        headSteps: 1,
        difficulty: -10,
        applicable: true,
        matched: false,
      });
      expect(InjuryTreatmentRules.difficulty('cauterize', injury({ bleeding: 2 }), TABLES)).toMatchObject({ difficulty: -10 });
      expect(InjuryTreatmentRules.rules(empty).tourniquetLocations).toEqual(['arm', 'leg']);
    });

    it('gives magic and herbs no difficulty', () => {
      for (const procedure of ['magic', 'herbs'] as const) {
        expect(InjuryTreatmentRules.difficulty(procedure, injury({ location: 'head' }), WITH_DIFFICULTIES)).toMatchObject({
          difficulty: 0,
          headSteps: 0,
          applicable: true,
        });
      }
    });
  });

  describe('apply', () => {
    const at = treatment().at;

    it('counts only success and absolute success as a working treatment (D5)', () => {
      expect(InjuryTreatmentRules.isSuccess('partial-success')).toBe(false);
      expect(InjuryTreatmentRules.isSuccess('success')).toBe(true);
      expect(InjuryTreatmentRules.isSuccess('absolute-success')).toBe(true);
      const partial = InjuryTreatmentRules.apply(
        injury({ bleeding: 2 }),
        treatment({ procedure: 'tourniquet', result: 'partial-success' }),
        0,
        TABLES,
      );
      expect(partial.bleeding).toBe(2);
      expect(partial.treatments).toHaveLength(1);
    });

    it('pressure stops a light bleeding and slows the rest by 4 (D5)', () => {
      const light = InjuryTreatmentRules.apply(injury({ bleeding: 2 }), treatment({ procedure: 'pressure' }), 0, TABLES);
      expect(light).toMatchObject({ bleeding: 0, bleedingControl: 'pressure', severity: 'light', updatedAt: at });
      const heavy = InjuryTreatmentRules.apply(
        injury({ bleeding: 7, severity: 'severe' }),
        treatment({ procedure: 'pressure' }),
        0,
        TABLES,
      );
      expect(heavy).toMatchObject({ bleeding: 3, bleedingControl: 'pressure', severity: 'medium' });
      const fallback = { ...TABLES, severity: TABLES.severity.filter(row => row.severity !== 'light') };
      expect(InjuryTreatmentRules.apply(injury({ bleeding: 3 }), treatment({ procedure: 'pressure' }), 0, fallback).bleeding).toBe(0);
    });

    it('cauterizing follows the band of its total in Table 13-1c of core (spec 068)', () => {
      const bleeding = injury({ bleeding: 5, penalty: -10 });
      const cauterize = (total: number) =>
        InjuryTreatmentRules.apply(bleeding, treatment({ procedure: 'cauterize', total, roll: 40 }), 10, WITH_068);
      expect(cauterize(60)).toMatchObject({ bleeding: 0, bleedingControl: 'cauterized' });
      expect(cauterize(120).bleeding).toBe(0);
      expect(cauterize(20)).toMatchObject({ bleeding: 2, bleedingControl: 'cauterized' });
      expect(cauterize(-5)).toMatchObject({ bleeding: 5, penalty: -10 });
      expect(InjuryTreatmentRules.cauterization(20, 40, WITH_068)).toEqual({ row: SPEC_068_TABLES.cauterization![1], unusualEvent: false });
      expect(InjuryTreatmentRules.cauterization(60, 77, WITH_068).unusualEvent).toBe(true);
    });

    it('refuses a cauterization when core has no Table 13-1c (spec 068)', () => {
      expect(() => InjuryTreatmentRules.cauterization(60, 40, TABLES)).toThrow(
        expect.objectContaining({ code: 'err-cauterization-table-missing' }),
      );
      expect(() => InjuryTreatmentRules.cauterization(60, 40, { ...TABLES, cauterization: [] })).toThrow(
        expect.objectContaining({ code: 'err-cauterization-table-missing' }),
      );
      const gap: HealingTables = { ...TABLES, cauterization: [SPEC_068_TABLES.cauterization![1]] };
      expect(() => InjuryTreatmentRules.cauterization(60, 40, gap)).toThrow(
        expect.objectContaining({ code: 'err-healing-table-out-of-range' }),
      );
    });

    it('magic always stops the bleeding; an absolute failure worsens the penalty and its base (D1)', () => {
      expect(InjuryTreatmentRules.apply(injury({ bleeding: 6 }), treatment({ procedure: 'magic' }), 0, TABLES)).toMatchObject({
        bleeding: 0,
        bleedingControl: 'magic',
      });
      const recovering = injury({ penalty: -4, initialPenalty: -10, severity: 'light' });
      const worse = InjuryTreatmentRules.apply(recovering, treatment({ result: 'absolute-failure', healingType: 'none' }), 25, TABLES);
      expect(worse).toMatchObject({ penalty: -29, initialPenalty: -35, severity: 'severe' });
    });

    it('stitches halve the penalty and its base toward zero, and keep the severity when nothing changes (D2)', () => {
      const stitched = InjuryTreatmentRules.apply(
        injury({ severity: 'medium', penalty: -21, initialPenalty: -21 }),
        treatment({ procedure: 'stitches' }),
        0,
        TABLES,
      );
      expect(stitched).toMatchObject({ penalty: -10, initialPenalty: -10, severity: 'light' });
      expect(stitched.bleedingControl).toBeUndefined();
      const one = InjuryTreatmentRules.apply(injury({ penalty: -1, initialPenalty: -1 }), treatment({ procedure: 'stitches' }), 0, TABLES);
      expect(Object.is(one.penalty, -0)).toBe(false);
      expect(one.penalty).toBe(0);
      const dressed = InjuryTreatmentRules.apply(injury({ severity: 'severe' }), treatment({ procedure: 'dress' }), 0, TABLES);
      expect(dressed.severity).toBe('severe');
    });

    it('validates stitches, tourniquets and healed injuries', () => {
      expect(() => InjuryTreatmentRules.validate('stitches', injury({ severity: 'medium' }), TABLES)).not.toThrow();
      expect(() => InjuryTreatmentRules.validate('stitches', injury({ severity: 'severe' }), TABLES)).toThrow(
        expect.objectContaining({ code: 'err-treatment-invalid-severity' }) as Error,
      );
      expect(() => InjuryTreatmentRules.validate('tourniquet', injury({ location: 'leg' }), TABLES)).not.toThrow();
      expect(() => InjuryTreatmentRules.validate('tourniquet', injury(), TABLES)).not.toThrow();
      expect(() => InjuryTreatmentRules.validate('tourniquet', injury({ location: 'head' }), TABLES)).toThrow(
        expect.objectContaining({ code: 'err-treatment-invalid-location' }) as Error,
      );
      expect(() => InjuryTreatmentRules.validate('tourniquet', injury({ location: 'head' }), WITH_DIFFICULTIES)).not.toThrow();
      expect(() => InjuryTreatmentRules.validate('dress', injury({ status: 'healed' }), TABLES)).toThrow(
        expect.objectContaining({ code: 'err-injury-healed' }) as Error,
      );
    });
  });

  describe('spec 068: surgery, limits and salve', () => {
    it('an injury of surgeryRequired only admits surgery or magic', () => {
      const organ = injury({ type: 'organ', severity: 'medium' });
      for (const procedure of ['dress', 'stitches', 'pressure', 'herbs'] as const) {
        expect(() => InjuryTreatmentRules.validate(procedure, organ, WITH_068)).toThrow(
          expect.objectContaining({ code: 'err-treatment-surgery-required' }),
        );
      }
      expect(() => InjuryTreatmentRules.validate('surgery', organ, WITH_068)).not.toThrow();
      expect(() => InjuryTreatmentRules.validate('magic', organ, WITH_068)).not.toThrow();
      expect(() => InjuryTreatmentRules.validate('dress', injury({ type: 'organ', severity: 'light' }), WITH_068)).not.toThrow();
      // Without the list in core nothing is refused
      expect(() => InjuryTreatmentRules.validate('dress', organ, TABLES)).not.toThrow();
    });

    it('a successful splint or cast sets the limits of the location', () => {
      const apply = (procedure: 'splint' | 'cast', location: 'leg' | 'arm' | 'chest', extra: Parameters<typeof treatment>[0] = {}) =>
        InjuryTreatmentRules.apply(injury({ location }), treatment({ procedure, ...extra }), 0, WITH_068).limits;
      expect(apply('splint', 'leg')).toEqual({ pace: 'jog' });
      expect(apply('splint', 'arm')).toEqual({ limbUnusable: true });
      expect(apply('splint', 'chest')).toBeUndefined();
      expect(apply('cast', 'leg')).toEqual({ maneuverPenaltyFactor: 0.25, pace: 'creep' });
      expect(apply('cast', 'leg', { castSupport: 'cane' })).toEqual({ maneuverPenaltyFactor: 0.25, pace: 'walk' });
      expect(apply('cast', 'leg', { castSupport: 'crutches' })).toEqual({ maneuverPenaltyFactor: 0.25, pace: 'run' });
      expect(apply('cast', 'arm')).toEqual({ maneuverPenaltyFactor: 0.25 });
      expect(apply('splint', 'leg', { result: 'failure' })).toBeUndefined();
      expect(apply('cast', 'leg', { result: 'partial-success' })).toBeUndefined();
      // Without the limits of core nothing is limited
      expect(InjuryTreatmentRules.apply(injury({ location: 'leg' }), treatment(), 0, TABLES).limits).toBeUndefined();
    });

    it('checks the salve modifier against the range of core, any value without it', () => {
      expect(() => InjuryTreatmentRules.validateSalveModifier(35, WITH_068)).not.toThrow();
      expect(() => InjuryTreatmentRules.validateSalveModifier(-15, WITH_068)).not.toThrow();
      expect(() => InjuryTreatmentRules.validateSalveModifier(36, WITH_068)).toThrow(
        expect.objectContaining({ code: 'err-treatment-salve-modifier-range' }),
      );
      expect(() => InjuryTreatmentRules.validateSalveModifier(-16, WITH_068)).toThrow(
        expect.objectContaining({ code: 'err-treatment-salve-modifier-range' }),
      );
      expect(() => InjuryTreatmentRules.validateSalveModifier(80, TABLES)).not.toThrow();
    });
  });
});
