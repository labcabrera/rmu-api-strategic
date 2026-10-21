import { CharacterHealthState, TacticalOutcomeMerger } from 'src/modules/characters/domain/services/healing/tactical-outcome-merger';
import { TacticalCharacterOutcome } from 'src/modules/characters/domain/value-objects/tactical-game-outcome.vo';
import { injury, treatment } from './healing.fixture';

const NOW = '2026-10-22T00:00:00.000Z';

const outcome = (props: Partial<TacticalCharacterOutcome> = {}): TacticalCharacterOutcome => ({
  tacticalGameId: 'tactical-001',
  tacticalGameName: 'Ambush',
  actorId: 'actor-001',
  characterId: 'character-001',
  name: 'Test',
  hp: { start: 40, end: 30, delta: -10 },
  injuries: [],
  injuriesAdded: [],
  injuriesUpdated: [],
  injuriesHealed: [],
  conditions: [],
  ...props,
});

const state = (props: Partial<CharacterHealthState> = {}): CharacterHealthState => ({
  hp: { max: 50, current: 40 },
  status: 'created',
  injuries: [],
  conditions: [],
  ...props,
});

describe('TacticalOutcomeMerger', () => {
  it('replaces injuries by uuid concatenating the treatments, adds new ones and keeps the rest', () => {
    const current = state({
      injuries: [
        injury({ id: 'kept', penalty: -5 }),
        injury({ id: 'changed', penalty: -10, treatments: [treatment({ id: 't-old' })], createdAt: '2026-01-01T00:00:00.000Z' }),
      ],
    });
    const result = TacticalOutcomeMerger.merge(
      current,
      outcome({
        injuries: [
          injury({
            id: 'changed',
            penalty: -20,
            treatments: [treatment({ id: 't-old' }), treatment({ id: 't-new', context: 'tactical' })],
          }),
          injury({ id: 'new', penalty: -15 }),
        ],
      }),
      30,
      NOW,
    );
    const byId = Object.fromEntries(result.state.injuries.map(i => [i.id, i]));
    expect(byId.kept.penalty).toBe(-5);
    expect(byId.changed.penalty).toBe(-20);
    expect(byId.changed.treatments.map(t => t.id)).toEqual(['t-old', 't-new']);
    expect(byId.changed.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(byId.new.penalty).toBe(-15);
    expect(result.summary).toMatchObject({ injuriesAdded: ['new'], injuriesUpdated: ['changed'] });
    // The input state is not mutated
    expect(current.injuries[1].penalty).toBe(-10);
  });

  it('resolves the snapshot conditions that ended during the game', () => {
    const current = state({
      conditions: [
        { id: 'c-1', status: 'unconscious', source: { kind: 'manual' }, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'c-2', status: 'unconscious', source: { kind: 'manual' }, createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    });
    const result = TacticalOutcomeMerger.merge(current, outcome({ conditionsResolved: ['c-1', 'missing'] }), 30, NOW);
    expect(result.state.conditions.find(c => c.id === 'c-1')?.resolvedAt).toBe(NOW);
    expect(result.state.conditions.find(c => c.id === 'c-2')?.resolvedAt).toBeUndefined();
    expect(result.summary.conditionsResolved).toEqual(['c-1']);
  });

  it('marks the injuries healed in tactical', () => {
    const result = TacticalOutcomeMerger.merge(
      state({ injuries: [injury({ id: 'a', bleeding: 2 })] }),
      outcome({ injuriesHealed: ['a', 'missing'] }),
      30,
      NOW,
    );
    expect(result.state.injuries[0]).toMatchObject({ status: 'healed', healedAt: NOW, penalty: 0, bleeding: 0 });
    expect(result.summary.injuriesHealed).toEqual(['a']);
  });

  it('applies the hits as a difference clamped between minus the death threshold and the maximum', () => {
    expect(TacticalOutcomeMerger.merge(state(), outcome({ hp: { start: 40, end: 30, delta: -10 } }), 30, NOW).state.hp.current).toBe(30);
    expect(TacticalOutcomeMerger.merge(state(), outcome({ hp: { start: 0, end: 100, delta: 100 } }), 30, NOW).state.hp.current).toBe(50);
    const dying = TacticalOutcomeMerger.merge(state(), outcome({ hp: { start: 40, end: -200, delta: -240 } }), 30, NOW);
    expect(dying.state.hp.current).toBe(-30);
    expect(dying.summary).toMatchObject({ hpBefore: 40, hpAfter: -30, hpDelta: -70 });
  });

  it('kills the character on a dead fate with a condition that keeps the origin', () => {
    const result = TacticalOutcomeMerger.merge(state(), outcome({ fate: 'dead' }), 30, NOW);
    expect(result.state.status).toBe('dead');
    expect(result.state.conditions).toHaveLength(1);
    expect(result.state.conditions[0]).toMatchObject({
      status: 'dead',
      source: { kind: 'manual', tacticalGameId: 'tactical-001', tacticalGameName: 'Ambush' },
    });
    expect(result.summary.dead).toBe(true);
  });

  it('kills the character with a dead condition and does not duplicate it', () => {
    const dead = { id: 'c-dead', status: 'dead' as const, source: { kind: 'critical' as const }, createdAt: NOW };
    const result = TacticalOutcomeMerger.merge(state(), outcome({ conditions: [dead], fate: 'dead' }), 30, NOW);
    expect(result.state.status).toBe('dead');
    expect(result.state.conditions).toHaveLength(1);
    expect(result.state.conditions[0]).toMatchObject({ id: 'c-dead', source: { kind: 'critical', tacticalGameId: 'tactical-001' } });
  });

  it('stabilizes the bleeding on a permanent unconscious fate', () => {
    const bleeding = injury({ id: 'b', bleeding: 4, bleedingControl: 'pressure' });
    const result = TacticalOutcomeMerger.merge(state(), outcome({ injuries: [bleeding], fate: 'permanent-unconscious' }), 30, NOW);
    expect(result.state.status).toBe('created');
    expect(result.state.conditions.map(c => c.status)).toEqual(['permanent-unconscious']);
    expect(result.state.injuries[0].bleeding).toBe(0);
    expect(result.state.injuries[0].bleedingControl).toBeUndefined();
  });

  it('adds the unconscious condition of the outcome once', () => {
    const unconscious = { id: 'c-1', status: 'unconscious' as const, source: { kind: 'critical' as const }, createdAt: NOW };
    const result = TacticalOutcomeMerger.merge(state({ conditions: [unconscious] }), outcome({ conditions: [unconscious] }), 30, NOW);
    expect(result.state.conditions).toHaveLength(1);
    expect(result.summary.conditionsAdded).toEqual([]);
  });
});
