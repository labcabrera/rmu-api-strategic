import type { TraitSpecializationKind } from './trait-specialization-matcher.js';

// Fixed sheet effects of talents and flaws by trait id (spec 008 §2, workspace spec 039).
// The value is applied per tier, or once when the trait has no tiers or the effect is `fixed`. Flaws use negative values.

export type TraitEffectTarget =
  | 'stat'
  | 'initiative'
  | 'skill'
  | 'professional-focus'
  | 'resistance'
  | 'defense'
  | 'natural-armor'
  | 'movement'
  | 'movement-multiplier'
  | 'encumbrance'
  | 'attack-bo'
  | 'attack-range'
  | 'attack-range-percent'
  | 'attack-size'
  | 'fumble';

export interface TraitEffect {
  target: TraitEffectTarget;
  value: number;
  // How the trait specialization selects the affected element. Ignored when fixed ids are given.
  specialization?: TraitSpecializationKind;
  // Fixed skills, stats or resistances affected
  ids?: string[];
  // Skill categories affected (skill effects)
  categories?: string[];
  // Modifier key for defense and attack BO effects
  key?: string;
  // Attack filters
  attackType?: 'melee' | 'ranged';
  offHand?: boolean;
  // Only weapon modes that can be thrown (attack-range-percent)
  thrown?: boolean;
  // The value is not multiplied by the tier
  fixed?: boolean;
  // Tiers the effect applies to
  minTier?: number;
  maxTier?: number;
  // Effects of the same group on one skill do not stack: only the highest counts
  group?: string;
  // Only skills that already receive a knack bonus
  requiresKnack?: boolean;
  // Fumble effects with a specialization: value for the attacks that do not match it
  otherwise?: number;
}

const REALMS = ['channeling', 'essence', 'mentalism'];

export const TRAIT_EFFECTS: Record<string, TraitEffect[]> = {
  // Core Law (spec 008)
  'fast-attack': [{ target: 'initiative', value: 5 }],
  'superior-stat': [{ target: 'stat', value: 1, specialization: 'stat' }],
  'inferior-stat': [{ target: 'stat', value: -1, specialization: 'stat' }],
  prodigy: [{ target: 'skill', value: 5, specialization: 'skill', group: 'prodigy' }],
  inept: [{ target: 'skill', value: -5, specialization: 'skill' }],
  tough: [{ target: 'skill', value: 5, ids: ['body-development'] }],
  fragile: [{ target: 'skill', value: -5, ids: ['body-development'] }],
  'recurved-musculature': [{ target: 'skill', value: 20, ids: ['acrobatics', 'climbing', 'jumping', 'running'] }],
  'wings-vestigial': [{ target: 'skill', value: 10, ids: ['jumping'] }],
  'direction-sense': [{ target: 'skill', value: 30, ids: ['navigation'] }],
  'look-of-eagles': [{ target: 'skill', value: 10, ids: ['leadership'] }],
  'perfect-pitch': [{ target: 'skill', value: 10, ids: ['music'], group: 'music' }],
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

  // Character Companion talents (workspace spec 039)
  composure: [{ target: 'resistance', value: 5, ids: ['fear'] }],
  fearless: [{ target: 'resistance', value: 5, ids: ['fear'] }],
  unbeliever: [{ target: 'resistance', value: 20, ids: REALMS, fixed: true }],
  'blazing-speed': [{ target: 'movement', value: 5 }],
  'weapon-control': [{ target: 'fumble', value: -2, specialization: 'melee-weapon-type', otherwise: -1, fixed: true }],
  'great-arm': [{ target: 'attack-range-percent', value: 25, thrown: true }],
  'double-jointed': [{ target: 'skill', value: 5, ids: ['acrobatics', 'contortions', 'music'] }],
  dwarfism: [
    { target: 'stat', value: 3, ids: ['qu'], fixed: true },
    { target: 'stat', value: -3, ids: ['st'], fixed: true },
  ],
  giantism: [
    { target: 'stat', value: 3, ids: ['st'], fixed: true },
    { target: 'stat', value: -3, ids: ['qu'], fixed: true },
  ],
  'master-channeler': [{ target: 'skill', value: 5, ids: ['channeling'] }],
  'master-of-ceremonies': [{ target: 'skill', value: 5, ids: ['magic-ritual'], group: 'prodigy' }],
  'eidetic-memory': [{ target: 'skill', value: 10, categories: ['lore'], fixed: true }],
  'enhanced-knack': [{ target: 'skill', value: 5, specialization: 'skill', requiresKnack: true, group: 'prodigy' }],
  'geographic-awareness': [{ target: 'skill', value: 10, ids: ['navigation'] }],
  herbalist: [{ target: 'skill', value: 5, ids: ['culinary', 'herbalism', 'poison-mastery'] }],
  'method-actor': [{ target: 'skill', value: 5, ids: ['acting'] }],
  musical: [{ target: 'skill', value: 10, ids: ['music', 'music-composition'], group: 'music' }],
  'natural-horseman': [{ target: 'skill', value: 10, ids: ['riding', 'animal-handling', 'mounted-combat'] }],
  'overwhelming-presence': [{ target: 'skill', value: 5, ids: ['influence', 'leadership', 'trading'] }],
  'prodigy-greater': [{ target: 'skill', value: 5, specialization: 'skill-category', group: 'prodigy' }],
  'professional-skill-focus': [{ target: 'professional-focus', value: 1, specialization: 'skill', fixed: true }],
  'quick-calculator': [{ target: 'skill', value: 5, categories: ['science'] }],
  'sleight-of-hand': [{ target: 'skill', value: 10, ids: ['stage-magic', 'trickery'] }],
  subtlety: [
    { target: 'skill', value: 5, ids: ['stalking'] },
    { target: 'skill', value: -5, ids: ['leadership'] },
  ],
  visualization: [{ target: 'skill', value: 5, categories: ['technical'], ids: ['engineering'] }],

  // Character Companion epic talents
  'blessed-by-a-war-god': [{ target: 'stat', value: 10, ids: ['st', 'qu', 'ag', 'co'], fixed: true }],
  'dense-musculature': [
    { target: 'attack-bo', value: 10, key: 'dense-musculature', fixed: true },
    { target: 'defense', value: 10, key: 'dense-musculature', fixed: true },
  ],

  // Character Companion flaws
  'bad-leg': [
    { target: 'movement-multiplier', value: 0.5, fixed: true },
    { target: 'attack-bo', value: -10, key: 'bad-leg', fixed: true },
    { target: 'stat', value: -3, ids: ['qu'], fixed: true },
  ],
  'missing-leg': [
    { target: 'movement-multiplier', value: 0.25, fixed: true },
    { target: 'attack-bo', value: -25, key: 'missing-leg', fixed: true },
    { target: 'stat', value: -5, ids: ['qu'], fixed: true },
  ],
  fumbler: [{ target: 'fumble', value: 2 }],
  'magical-susceptibility': [
    { target: 'resistance', value: -20, specialization: 'realm', fixed: true, maxTier: 1 },
    { target: 'resistance', value: -20, ids: REALMS, fixed: true, minTier: 2 },
  ],
  nearsighted: [{ target: 'attack-range-percent', value: -20 }],
  oblivious: [{ target: 'skill', value: -15, ids: ['perception', 'social-awareness', 'tracking'], fixed: true }],
  overweight: [{ target: 'encumbrance', value: 10 }],
  panicky: [{ target: 'resistance', value: -10, ids: ['fear'], fixed: true }],
  slow: [{ target: 'movement', value: -5 }],
  sloth: [
    { target: 'attack-bo', value: -10, key: 'sloth', fixed: true },
    { target: 'defense', value: -10, key: 'sloth', fixed: true },
    { target: 'initiative', value: -10, fixed: true },
  ],
  'socially-awkward': [
    { target: 'skill', value: -20, ids: ['influence', 'leadership', 'trading'], categories: ['performance-art'], fixed: true, minTier: 2 },
  ],
};
