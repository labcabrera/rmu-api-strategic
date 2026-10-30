import { HealingCalculator } from '../../../../../src/modules/characters/domain/services/healing/healing-calculator.js';
import { ValidationError } from '../../../../../src/modules/shared/domain/errors/errors.js';
import { injury, TABLES, treatment } from './healing.fixture.js';

const NOW = '2026-10-22T00:00:00.000Z';

describe('HealingCalculator', () => {
  const calculator = new HealingCalculator(TABLES);

  describe('severity', () => {
    it('derives the severity from the penalty magnitude', () => {
      expect(calculator.severity(0, undefined)).toBe('light');
      expect(calculator.severity(-10, 0)).toBe('light');
      expect(calculator.severity(-11, 0)).toBe('medium');
      expect(calculator.severity(-30, 0)).toBe('medium');
      expect(calculator.severity(-31, 0)).toBe('severe');
    });

    it('takes the worse of penalty and bleeding', () => {
      expect(calculator.severity(-5, 3)).toBe('medium');
      expect(calculator.severity(-5, 6)).toBe('severe');
      expect(calculator.severity(-40, 1)).toBe('severe');
    });
  });

  describe('type of healing', () => {
    it('derives the type from the procedure, the result and the herbalism roll', () => {
      expect(HealingCalculator.healingType('magic', 'success', false)).toBe('magic-or-herbs');
      expect(HealingCalculator.healingType('magic', 'success', true)).toBe('magic-and-herbs');
      expect(HealingCalculator.healingType('splint', 'failure', true)).toBe('none');
      expect(HealingCalculator.healingType('splint', 'absolute-failure', false)).toBe('none');
      expect(HealingCalculator.healingType('splint', 'success', true)).toBe('magic-or-herbs');
      expect(HealingCalculator.healingType('splint', 'absolute-success', false)).toBe('medicine-absolute');
      expect(HealingCalculator.healingType('splint', 'partial-success', false)).toBe('medicine');
      expect(HealingCalculator.healingType('splint', 'success', false)).toBe('medicine');
    });

    it('uses the none row for untreated injuries and adds the medical modifier only on partial success', () => {
      expect(calculator.healingTypeModifier(undefined)).toEqual({ healingType: 'none', modifier: -90 });
      expect(
        calculator.healingTypeModifier(treatment({ healingType: 'medicine-absolute', result: 'absolute-success', recoveryModifier: 25 })),
      ).toEqual({ healingType: 'medicine-absolute', modifier: 15 });
      expect(
        calculator.healingTypeModifier(treatment({ healingType: 'medicine', result: 'partial-success', recoveryModifier: -25 })),
      ).toEqual({ healingType: 'medicine', modifier: -25 });
      expect(calculator.healingTypeModifier(treatment({ healingType: 'none', result: 'failure', recoveryModifier: -100 })).modifier).toBe(
        -90,
      );
    });
  });

  it('adds body development ranks and Co bonus, uses the latest treatment and subtracts the penalty', () => {
    const treated = injury({
      penalty: -20,
      treatments: [treatment({ id: 't1', healingType: 'none', result: 'failure' }), treatment({ id: 't2', healingType: 'magic-or-herbs' })],
    });
    expect(calculator.recoveryModifiers({ bodyDevelopmentRanks: 10, constitutionBonus: 6 }, treated)).toMatchObject({
      bodyDevelopmentRanks: 10,
      constitutionBonus: 6,
      healingType: 'magic-or-herbs',
      healingTypeModifier: 40,
      penalty: 20,
      total: 10 + 6 + 40 - 20,
    });
    expect(calculator.recoveryModifiers({ bodyDevelopmentRanks: 0, constitutionBonus: 0 }, injury()).total).toBe(-90 - 10);
  });

  it('spec 052: breaks the total down with its rules, the partial success apart from the type of healing', () => {
    const treated = injury({
      penalty: -20,
      treatments: [treatment({ healingType: 'medicine', result: 'partial-success', recoveryModifier: -25, procedure: 'splint' })],
    });
    const { breakdown, total } = calculator.recoveryModifiers({ bodyDevelopmentRanks: 10, constitutionBonus: 6 }, treated);
    expect(breakdown.map(({ key, value }) => [key, value])).toEqual([
      ['body-development-ranks', 10],
      ['constitution-bonus', 6],
      ['healing-type', 0],
      ['partial-success', -25],
      ['injury-penalty', -20],
    ]);
    expect(breakdown.reduce((sum, modifier) => sum + modifier.value, 0)).toBe(total);
    expect(breakdown[2]).toMatchObject({
      rule: 'Table 13-1a',
      params: { healingType: 'healing-type-medicine', procedure: 'procedure-splint' },
    });
  });

  it('spec 052: explains the days with the row, the column and every multiplier', () => {
    const days = calculator.daysExplanation(injury({ type: 'bone', severity: 'severe', location: 'head' }), 50, 0.5, [
      'fast-healer',
      'prodigy',
    ]);
    expect(days).toEqual({
      column: 'injury-type-bone',
      days: 10,
      severity: 'severe',
      severityMultiplier: expect.any(Number) as number,
      headMultiplier: expect.any(Number) as number,
      raceMultiplier: 0.5,
      'fast-healer': expect.any(Number) as number,
    });
  });

  describe('recovery days', () => {
    it('reads the column of the injury type and band, times severity and head', () => {
      expect(calculator.baseDays(injury({ type: 'bone' }), 50)).toBe(10);
      expect(calculator.baseDays(injury({ type: 'organ' }), 0)).toBe(33);
      expect(calculator.baseDays(injury({ type: 'skin-tissue' }), 101)).toBe(7);
      expect(calculator.baseDays(injury({ type: 'bone', severity: 'medium' }), 50)).toBe(30);
      expect(calculator.baseDays(injury({ type: 'bone', severity: 'severe', location: 'head' }), 50)).toBe(140);
    });

    it('requires a known injury type', () => {
      expect(() => calculator.baseDays(injury({ type: 'unknown' }), 50)).toThrow(ValidationError);
    });

    it('multiplies the race recovery multiplier by Fast and Slow Healer', () => {
      expect(calculator.recoveryMultiplier(undefined, [])).toBe(1);
      expect(calculator.recoveryMultiplier(0.5, ['prodigy'])).toBe(0.5);
      expect(calculator.recoveryMultiplier(2, ['fast-healer'])).toBe(1);
      expect(calculator.recoveryMultiplier(1, ['slow-healer', 'slow-healer'])).toBe(2);
    });

    it('rounds the total days up with a minimum of one', () => {
      expect(HealingCalculator.totalDays(3, 0.5)).toBe(2);
      expect(HealingCalculator.totalDays(1, 0.5)).toBe(1);
      expect(HealingCalculator.totalDays(0, 1)).toBe(1);
      expect(HealingCalculator.totalDays(10, 2)).toBe(20);
      expect(HealingCalculator.totalDays(0.1 * 3, 10)).toBe(3);
    });

    it('builds the recovery with the counter at the total days', () => {
      const recovery = calculator.recovery(injury({ severity: 'medium' }), 40, 20, 0.5, NOW);
      expect(recovery).toEqual({
        roll: 40,
        modifiers: 20,
        total: 60,
        baseDays: 30,
        multiplier: 0.5,
        totalDays: 15,
        remainingDays: 15,
        startedAt: NOW,
        untreated: true,
      });
      const treated = calculator.recovery(injury({ treatments: [treatment({ id: 't-1' })] }), 40, 20, 1, NOW);
      expect(treated).toMatchObject({ treatmentId: 't-1', untreated: false });
      const failed = injury({ treatments: [treatment({ id: 't-2', result: 'failure', healingType: 'none' })] });
      expect(calculator.recovery(failed, 40, 20, 1, NOW)).toMatchObject({ treatmentId: 't-2', untreated: true });
    });

    it('knows whether the latest treatment already has its recovery roll (D10)', () => {
      const recovery = calculator.recovery(injury({ treatments: [treatment({ id: 't-1' })] }), 40, 20, 1, NOW);
      expect(HealingCalculator.isRecoveryRolled(injury())).toBe(false);
      expect(HealingCalculator.isRecoveryRolled(injury({ treatments: [treatment({ id: 't-1' })], recovery }))).toBe(true);
      const retreated = injury({ treatments: [treatment({ id: 't-1' }), treatment({ id: 't-2' })], recovery });
      expect(HealingCalculator.isRecoveryRolled(retreated)).toBe(false);
      expect(HealingCalculator.isRecoveryRolled(injury({ recovery: { ...recovery, treatmentId: undefined } }))).toBe(true);
    });
  });

  it('checks doubles of the unmodified roll for permanent injuries', () => {
    expect(HealingCalculator.isPermanentCheckRequired('light', 22)).toBe(false);
    expect(HealingCalculator.isPermanentCheckRequired('light', 37, true)).toBe(true);
    expect(HealingCalculator.isPermanentCheckRequired('medium', 22)).toBe(true);
    expect(HealingCalculator.isPermanentCheckRequired('medium', 100)).toBe(true);
    expect(HealingCalculator.isPermanentCheckRequired('medium', 33)).toBe(false);
    expect(HealingCalculator.isPermanentCheckRequired('severe', 33)).toBe(true);
    expect(HealingCalculator.isPermanentCheckRequired('severe', 11)).toBe(true);
    expect(HealingCalculator.isPermanentCheckRequired('severe', 34)).toBe(false);
    expect(HealingCalculator.isPermanentCheckRequired('severe', 111)).toBe(false);
  });

  it('keeps the fraction of the initial penalty from the permanent table', () => {
    expect(calculator.permanentPenalty(-30, 40, 10)).toEqual({ total: 50, result: 'failure', fraction: 0.6, penalty: -18 });
    expect(calculator.permanentPenalty(-30, -20, 10)).toMatchObject({ result: 'absolute-failure', penalty: -30 });
    const none = calculator.permanentPenalty(-30, 200, 0);
    expect(none.penalty).toBe(0);
    expect(Object.is(none.penalty, -0)).toBe(false);
  });

  describe('rest', () => {
    it('recovers a percentage of the maximum hits per complete period, up to the maximum', () => {
      expect(calculator.restHp(50, 10, 1)).toBe(10);
      expect(calculator.restHp(50, 10, 3)).toBe(15);
      expect(calculator.restHp(55, 10, 4)).toBe(21);
      expect(calculator.restHp(50, -5, 8)).toBe(15);
      expect(calculator.restHp(50, 45, 24)).toBe(50);
      expect(calculator.restHp(50, 50, 24)).toBe(50);
    });

    it('counts complete rest days double', () => {
      expect(calculator.restDays(3, false)).toBe(3);
      expect(calculator.restDays(3, true)).toBe(6);
    });

    it('front-loads the daily reduction (D6)', () => {
      // -15 over 10 days: -2 per day for the first 5 days, then -1 per day
      const penalties = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(remaining => HealingCalculator.penaltyAfter(-15, 10, remaining));
      expect(penalties).toEqual([-13, -11, -9, -7, -5, -4, -3, -2, -1, 0]);
      // -30 over 20 days: -2 per day for the first 10 days, then -1 per day
      expect(HealingCalculator.penaltyAfter(-30, 20, 20)).toBe(-30);
      expect(HealingCalculator.penaltyAfter(-30, 20, 10)).toBe(-10);
      expect(HealingCalculator.penaltyAfter(-30, 20, 5)).toBe(-5);
      // Fewer points than days: one per day until it is gone
      expect(HealingCalculator.penaltyAfter(-3, 10, 8)).toBe(-1);
      expect(HealingCalculator.penaltyAfter(-3, 10, 6)).toBe(0);
      expect(Object.is(HealingCalculator.penaltyAfter(-3, 10, 6), -0)).toBe(false);
      expect(HealingCalculator.penaltyAfter(-20, 10, 0)).toBe(0);
      expect(HealingCalculator.penaltyAfter(-20, 0, 5)).toBe(0);
    });
  });

  describe('advance', () => {
    const recovering = injury({
      penalty: -10,
      initialPenalty: -10,
      treatments: [treatment()],
      recovery: { roll: 50, modifiers: 0, total: 50, baseDays: 10, multiplier: 1, totalDays: 10, remainingDays: 10, startedAt: NOW },
      status: 'recovering',
    });

    it('discounts days and reduces the penalty', () => {
      const progress = HealingCalculator.advance(recovering, 4, NOW);
      expect(progress.days).toBe(4);
      expect(progress.finished).toBe(false);
      expect(progress.injury.recovery!.remainingDays).toBe(6);
      expect(progress.injury.penalty).toBe(-6);
      expect(progress.injury.status).toBe('recovering');
    });

    it('heals the injury when the counter reaches 0', () => {
      const progress = HealingCalculator.advance({ ...recovering, bleeding: 1 }, 30, NOW);
      expect(progress).toMatchObject({ days: 10, finished: true });
      expect(progress.injury).toMatchObject({ status: 'healed', penalty: 0, bleeding: 0, healedAt: NOW });
    });

    it('leaves the permanent penalty when there is one', () => {
      const progress = HealingCalculator.advance({ ...recovering, permanent: { penalty: -4, roll: 30 } }, 10, NOW);
      expect(progress.injury).toMatchObject({ status: 'permanent', penalty: -4 });
      expect(progress.injury.healedAt).toBeUndefined();
    });

    it('does not improve without recovery roll or when permanent', () => {
      expect(HealingCalculator.advance(injury(), 5, NOW)).toMatchObject({ days: 0, finished: false });
      const permanent = { ...recovering, status: 'permanent' as const };
      expect(HealingCalculator.advance(permanent, 5, NOW).days).toBe(0);
    });

    it('improves an untreated injury, light ones too, and leaves it permanent at the end (D3)', () => {
      const untreated = {
        ...recovering,
        severity: 'medium' as const,
        treatments: [],
        recovery: { ...recovering.recovery!, untreated: true },
      };
      expect(HealingCalculator.advance(untreated, 5, NOW)).toMatchObject({ days: 5, injury: { status: 'recovering', penalty: -5 } });
      const ended = HealingCalculator.advance(untreated, 10, NOW).injury;
      expect(ended).toMatchObject({ status: 'permanent', penalty: -10, permanent: { penalty: -10 } });
      expect(ended.healedAt).toBeUndefined();
      const rolled = HealingCalculator.advance({ ...untreated, permanent: { penalty: -6, roll: 40 } }, 10, NOW).injury;
      expect(rolled).toMatchObject({ status: 'permanent', penalty: -6 });
      const spared = HealingCalculator.advance({ ...untreated, permanent: { penalty: 0, roll: 99 } }, 10, NOW).injury;
      expect(spared).toMatchObject({ status: 'healed', penalty: 0 });
      const light = { ...untreated, severity: 'light' as const };
      expect(HealingCalculator.advance(light, 10, NOW).injury.status).toBe('permanent');
      const noPenalty = { ...untreated, penalty: 0, initialPenalty: 0, bleeding: 2 };
      expect(HealingCalculator.advance(noPenalty, 10, NOW).injury).toMatchObject({ status: 'healed', bleeding: 0 });
    });
  });
});
