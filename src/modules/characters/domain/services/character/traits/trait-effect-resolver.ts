import { CharacterTrait } from '../../../value-objects/character-trait.vo.js';
import { TRAIT_EFFECTS, type TraitEffect, type TraitEffectTarget } from './trait-effects.registry.js';

export interface AppliedTraitEffect {
  traitId: string;
  specialization: string | undefined;
  effect: TraitEffect;
  value: number;
}

// When the same trait is present twice (race and character), only the highest tier counts. A trait imported without
// its catalog entry (spec 024) has no effect
export function getEffectiveTraits(traits: CharacterTrait[] | undefined | null): CharacterTrait[] {
  const result = new Map<string, CharacterTrait>();
  (traits || [])
    .filter(trait => !trait.missingReference)
    .forEach(trait => {
      const key = `${trait.traitId}|${trait.specialization ?? ''}`;
      const current = result.get(key);
      if (!current || (trait.tier ?? 0) > (current.tier ?? 0)) {
        result.set(key, trait);
      }
    });
  return Array.from(result.values());
}

function appliesToTier(effect: TraitEffect, tier: number): boolean {
  return (effect.minTier === undefined || tier >= effect.minTier) && (effect.maxTier === undefined || tier <= effect.maxTier);
}

export function getTraitEffects(traits: CharacterTrait[] | undefined | null, target: TraitEffectTarget): AppliedTraitEffect[] {
  const result: AppliedTraitEffect[] = [];
  getEffectiveTraits(traits).forEach(trait => {
    const tier = trait.tier ?? 1;
    const effects = TRAIT_EFFECTS[trait.traitId] || [];
    effects
      .filter(effect => effect.target === target && appliesToTier(effect, tier))
      .forEach(effect => {
        result.push({
          traitId: trait.traitId,
          specialization: trait.specialization,
          effect,
          value: effect.fixed ? effect.value : effect.value * tier,
        });
      });
  });
  return result;
}

// Effects that share a group do not stack: the highest of each group counts (workspace spec 039, decision 8)
export function sumTraitEffects(effects: AppliedTraitEffect[]): number {
  const groups = new Map<string, number>();
  let sum = 0;
  effects.forEach(e => {
    if (!e.effect.group) {
      sum += e.value;
      return;
    }
    const current = groups.get(e.effect.group);
    groups.set(e.effect.group, current === undefined ? e.value : Math.max(current, e.value));
  });
  groups.forEach(value => (sum += value));
  return sum;
}

// Product of multiplier effects (movement)
export function multiplyTraitEffects(effects: AppliedTraitEffect[]): number {
  return effects.reduce((product, e) => product * e.value, 1);
}
