import { randomUUID } from 'crypto';
import type { CharacterCondition } from '../../value-objects/character-condition.vo.js';
import type { CharacterStatus } from '../../value-objects/character-status.vo.js';
import type { Injury, InjurySource } from '../../value-objects/injury.vo.js';
import type { TacticalCharacterOutcome } from '../../value-objects/tactical-game-outcome.vo.js';

export interface CharacterHealthState {
  hp: { max: number; current: number };
  status: CharacterStatus;
  injuries: Injury[];
  conditions: CharacterCondition[];
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
  fate?: string;
  dead: boolean;
}

export interface OutcomeMergeResult {
  state: CharacterHealthState;
  summary: OutcomeMergeSummary;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * Merges the outcome of a tactical game into the strategic health of a character (spec 013, section 4):
 * injuries by uuid (treatments concatenated), healed injuries, hits as a difference and conditions from the fate.
 * Injuries of the character that the outcome does not mention are kept as they are.
 */
export class TacticalOutcomeMerger {
  static merge(current: CharacterHealthState, outcome: TacticalCharacterOutcome, deathThreshold: number, now: string): OutcomeMergeResult {
    const injuries = current.injuries.map(i => ({ ...i }));
    const added: string[] = [];
    const updated: string[] = [];
    for (const incoming of outcome.injuries || []) {
      const index = injuries.findIndex(i => i.id === incoming.id);
      if (index < 0) {
        injuries.push({ ...incoming, treatments: [...(incoming.treatments || [])] });
        added.push(incoming.id);
        continue;
      }
      const existing = injuries[index];
      const known = new Set(existing.treatments.map(t => t.id));
      const treatments = [...existing.treatments, ...(incoming.treatments || []).filter(t => !known.has(t.id))];
      injuries[index] = { ...incoming, treatments, createdAt: existing.createdAt || incoming.createdAt, updatedAt: now };
      updated.push(incoming.id);
    }
    const healed: string[] = [];
    for (const id of outcome.injuriesHealed || []) {
      const index = injuries.findIndex(i => i.id === id);
      if (index < 0) continue;
      injuries[index] = { ...injuries[index], status: 'healed', penalty: 0, bleeding: 0, healedAt: now, updatedAt: now };
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

    const delta = outcome.hp?.delta ?? 0;
    const hpAfter = clamp(current.hp.current + delta, -Math.abs(deathThreshold), current.hp.max);
    return {
      state: { hp: { max: current.hp.max, current: hpAfter }, status, injuries, conditions },
      summary: {
        hpBefore: current.hp.current,
        hpAfter,
        hpDelta: hpAfter - current.hp.current,
        injuriesAdded: added,
        injuriesUpdated: updated,
        injuriesHealed: healed,
        conditionsAdded,
        conditionsResolved: resolved,
        fate: outcome.fate,
        dead: status === 'dead',
      },
    };
  }
}
