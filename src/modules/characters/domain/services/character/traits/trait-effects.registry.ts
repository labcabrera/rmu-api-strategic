import type { TraitSpecializationKind } from './trait-specialization-matcher.js';

// Fixed sheet effects of talents and flaws by trait id (spec 008 §2).
// The value is applied per tier, or once when the trait has no tiers. Flaws use negative values.

export type TraitEffectTarget =
  'stat' | 'initiative' | 'skill' | 'resistance' | 'defense' | 'natural-armor' | 'movement' | 'attack-bo' | 'attack-range' | 'attack-size';

export interface TraitEffect {
  target: TraitEffectTarget;
  value: number;
  // How the trait specialization selects the affected element. Ignored when fixed ids are given.
  specialization?: TraitSpecializationKind;
  // Fixed skills or resistances affected
  ids?: string[];
  // Modifier key for defense and attack BO effects
  key?: string;
  // Attack filters
  attackType?: 'melee' | 'ranged';
  offHand?: boolean;
}

export const TRAIT_EFFECTS: Record<string, TraitEffect[]> = {
  'fast-attack': [{ target: 'initiative', value: 5 }],
  'superior-stat': [{ target: 'stat', value: 1, specialization: 'stat' }],
  'inferior-stat': [{ target: 'stat', value: -1, specialization: 'stat' }],
  prodigy: [{ target: 'skill', value: 5, specialization: 'skill' }],
  inept: [{ target: 'skill', value: -5, specialization: 'skill' }],
  tough: [{ target: 'skill', value: 5, ids: ['body-development'] }],
  fragile: [{ target: 'skill', value: -5, ids: ['body-development'] }],
  'recurved-musculature': [{ target: 'skill', value: 20, ids: ['acrobatics', 'climbing', 'jumping', 'running'] }],
  'wings-vestigial': [{ target: 'skill', value: 10, ids: ['jumping'] }],
  'direction-sense': [{ target: 'skill', value: 30, ids: ['navigation'] }],
  'look-of-eagles': [{ target: 'skill', value: 10, ids: ['leadership'] }],
  'perfect-pitch': [{ target: 'skill', value: 10, ids: ['music'] }],
  'physical-resistance': [{ target: 'resistance', value: 5, ids: ['physical'] }],
  'physical-vulnerability': [{ target: 'resistance', value: -5, ids: ['physical'] }],
  'magical-resistance': [{ target: 'resistance', value: 5, specialization: 'realm' }],
  'magical-vulnerability': [{ target: 'resistance', value: -5, specialization: 'realm' }],
  'iron-will': [{ target: 'resistance', value: 5, ids: ['mentalism'] }],
  'defensive-aura': [{ target: 'defense', value: 5, key: 'defensive-aura' }],
  'natural-armor': [{ target: 'natural-armor', value: 1 }],
  'increased-stride': [{ target: 'movement', value: 2 }],
  'decreased-stride': [{ target: 'movement', value: -2 }],
  ambidextrous: [{ target: 'attack-bo', value: 20, key: 'ambidextrous', offHand: true }],
  'one-eye': [{ target: 'attack-bo', value: -25, key: 'oneEye', attackType: 'ranged' }],
  deadeye: [{ target: 'attack-range', value: 10, specialization: 'ranged-weapon-type' }],
  'enhanced-attack': [{ target: 'attack-size', value: 1, specialization: 'skill' }],
  'lesser-attack': [{ target: 'attack-size', value: -1, specialization: 'skill' }],
};
