import { randomUUID } from 'crypto';
import type { CharacterCondition } from '../../value-objects/character-condition.vo.js';
import type { CharacterStatus } from '../../value-objects/character-status.vo.js';
import type { Injury, InjurySource } from '../../value-objects/injury.vo.js';
import type { TacticalCharacterOutcome } from '../../value-objects/tactical-game-outcome.vo.js';
import { type CharacterTemporaryModifier, expiresGameDay } from '../../value-objects/temporary-modifier.vo.js';

export interface CharacterHealthState {
  hp: { max: number; current: number };
  status: CharacterStatus;
  injuries: Injury[];
  conditions: CharacterCondition[];
  /** Workspace spec 068 (always set in the merged state) */
  temporaryModifiers?: CharacterTemporaryModifier[];
}

export interface OutcomeMergeSummary {
  hpBefore: number;
  hpAfter: number;
  hpDelta: number;
  injuriesAdded: string[];
  injuriesUpdated: string[];
  injuriesHealed: string[];
  conditionsAdded: string[];
  conditionsResolved: string[];
  /** Workspace spec 068: the temporary modifiers the game added */
  temporaryModifiersAdded?: string[];
  fate?: string;
  dead: boolean;
}

export interface OutcomeMergeResult {
  state: CharacterHealthState;
  summary: OutcomeMergeSummary;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * The recovery base of an injury is never below its current penalty: an absolute failure in the game worsens both
 * (spec 022, D1), and a tactical version that only worsened the penalty still gets it into the recovery.
 */
const withRecoveryBase = (injury: Injury): Injury => {
  const penalty = Math.min(0, injury.penalty || 0);
  const initialPenalty = Math.min(penalty, injury.initialPenalty ?? penalty);
  return initialPenalty === injury.initialPenalty ? injury : { ...injury, initialPenalty };
};

/**
 * Merges the outcome of a tactical game into the strategic health of a character (spec 013, section 4):
 * injuries by uuid (treatments concatenated), healed injuries, hits as a difference and conditions from the fate.
 * Injuries of the character that the outcome does not mention are kept as they are. The penalty, its recovery base
 * (`initialPenalty`) and the severity come from tactical, which updates them on an absolute failure (spec 022, D1).
 * Workspace spec 068: the limits, reopening and tourniquet of the injuries come from tactical too, and the new
 * temporary modifiers are added (by id) with their expiry counted from `currentGameDay`.
 */
export class TacticalOutcomeMerger {
  static merge(
    current: CharacterHealthState,
    outcome: TacticalCharacterOutcome,
    deathThreshold: number,
    now: string,
    currentGameDay = 1,
  ): OutcomeMergeResult {
    const injuries = current.injuries.map(i => ({ ...i }));
    const added: string[] = [];
    const updated: string[] = [];
    for (const incoming of outcome.injuries || []) {
      const index = injuries.findIndex(i => i.id === incoming.id);
      if (index < 0) {
        injuries.push(withRecoveryBase({ ...incoming, treatments: [...(incoming.treatments || [])] }));
        added.push(incoming.id);
        continue;
      }
      const existing = injuries[index];
      const known = new Set(existing.treatments.map(t => t.id));
      const treatments = [...existing.treatments, ...(incoming.treatments || []).filter(t => !known.has(t.id))];
      injuries[index] = withRecoveryBase({
        ...incoming,
        treatments,
        // Workspace spec 068: a tactical before it sends no limits, so the strategic ones stay
        ...(incoming.limits === undefined && existing.limits !== undefined ? { limits: existing.limits } : {}),
        createdAt: existing.createdAt || incoming.createdAt,
        updatedAt: now,
      });
      updated.push(incoming.id);
    }
    const healed: string[] = [];
    for (const id of outcome.injuriesHealed || []) {
      const index = injuries.findIndex(i => i.id === id);
      if (index < 0) continue;
      injuries[index] = {
        ...injuries[index],
        status: 'healed',
        penalty: 0,
        bleeding: 0,
        healedAt: now,
        updatedAt: now,
        limits: null,
        reopenOn: null,
        tourniquet: null,
      };
      healed.push(id);
    }

    const conditions = current.conditions.map(c => ({ ...c }));
    const conditionsAdded: string[] = [];
    const addCondition = (condition: CharacterCondition) => {
      if (conditions.some(c => c.id === condition.id)) return;
      if (conditions.some(c => !c.resolvedAt && c.status === condition.status && c.source.tacticalGameId === outcome.tacticalGameId))
        return;
      conditions.push({ ...condition });
      conditionsAdded.push(condition.id);
    };
    const resolved: string[] = [];
    for (const id of outcome.conditionsResolved || []) {
      const index = conditions.findIndex(c => c.id === id && !c.resolvedAt);
      if (index < 0) continue;
      conditions[index] = { ...conditions[index], resolvedAt: now };
      resolved.push(id);
    }
    const source: InjurySource = { kind: 'manual', tacticalGameId: outcome.tacticalGameId, tacticalGameName: outcome.tacticalGameName };
    for (const condition of outcome.conditions || []) {
      addCondition({ ...condition, source: { ...source, ...(condition.source || {}) }, createdAt: condition.createdAt || now });
    }
    let status = current.status;
    if (outcome.fate === 'dead' || (outcome.conditions || []).some(c => c.status === 'dead')) {
      status = 'dead';
      if (!conditions.some(c => !c.resolvedAt && c.status === 'dead')) {
        addCondition({ id: randomUUID(), status: 'dead', source, createdAt: now });
      }
    }
    if (outcome.fate === 'permanent-unconscious') {
      addCondition({ id: randomUUID(), status: 'permanent-unconscious', source, createdAt: now });
      // Stabilized by the fate: the bleeding stops without a bleeding control
      injuries.forEach((injury, index) => {
        if (injury.status !== 'healed' && injury.bleeding) {
          injuries[index] = { ...injury, bleeding: 0, bleedingControl: undefined, updatedAt: now };
        }
      });
    }

    const temporaryModifiers = (current.temporaryModifiers || []).map(m => ({ ...m }));
    const modifiersAdded: string[] = [];
    for (const modifier of outcome.temporaryModifiers || []) {
      if (temporaryModifiers.some(m => m.id === modifier.id)) continue;
      temporaryModifiers.push({
        ...modifier,
        tacticalGameId: modifier.tacticalGameId ?? outcome.tacticalGameId,
        expiresGameDay: expiresGameDay(modifier.days, currentGameDay),
      });
      modifiersAdded.push(modifier.id);
    }

    const delta = outcome.hp?.delta ?? 0;
    const hpAfter = clamp(current.hp.current + delta, -Math.abs(deathThreshold), current.hp.max);
    return {
      state: { hp: { max: current.hp.max, current: hpAfter }, status, injuries, conditions, temporaryModifiers },
      summary: {
        hpBefore: current.hp.current,
        hpAfter,
        hpDelta: hpAfter - current.hp.current,
        injuriesAdded: added,
        injuriesUpdated: updated,
        injuriesHealed: healed,
        conditionsAdded,
        conditionsResolved: resolved,
        ...(modifiersAdded.length > 0 ? { temporaryModifiersAdded: modifiersAdded } : {}),
        fate: outcome.fate,
        dead: status === 'dead',
      },
    };
  }
}
