import { InjuryTreatmentRules } from '../../../../../src/modules/characters/domain/services/healing/injury-treatment-rules.js';
import type { HealingTables } from '../../../../../src/modules/characters/domain/value-objects/healing-tables.vo.js';
import { injury, TABLES, treatment } from './healing.fixture.js';

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

    it('cauterizing stops the bleeding (partial success too), halves it on a failure, nothing on an absolute failure (D5)', () => {
      const bleeding = injury({ bleeding: 5, penalty: -10 });
      const cauterize = (result: Parameters<typeof treatment>[0]) =>
        InjuryTreatmentRules.apply(bleeding, treatment({ procedure: 'cauterize', ...result }), 10, TABLES);
      expect(cauterize({ result: 'partial-success' })).toMatchObject({ bleeding: 0, bleedingControl: 'cauterized' });
      expect(cauterize({ result: 'success' }).bleeding).toBe(0);
      expect(cauterize({ result: 'failure' })).toMatchObject({ bleeding: 2, bleedingControl: 'cauterized' });
      expect(cauterize({ result: 'absolute-failure' })).toMatchObject({ bleeding: 5, penalty: -10 });
      expect(InjuryTreatmentRules.heatCritical('cauterize', 'absolute-failure')).toBe('D');
      expect(InjuryTreatmentRules.heatCritical('cauterize', 'success')).toBe('A');
      expect(InjuryTreatmentRules.heatCritical('cauterize', 'absolute-success')).toBeUndefined();
      expect(InjuryTreatmentRules.heatCritical('dress', 'failure')).toBeUndefined();
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
});
