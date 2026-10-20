import { CharacterTrait } from '../../../value-objects/character-trait.vo';
import { TRAIT_EFFECTS, TraitEffect, TraitEffectTarget } from './trait-effects.registry';

export interface AppliedTraitEffect {
  traitId: string;
  specialization: string | undefined;
  effect: TraitEffect;
  value: number;
}

// When the same trait is present twice (race and character), only the highest tier counts
export function getEffectiveTraits(traits: CharacterTrait[] | undefined | null): CharacterTrait[] {
  const result = new Map<string, CharacterTrait>();
  (traits || []).forEach(trait => {
    const key = `${trait.traitId}|${trait.specialization ?? ''}`;
    const current = result.get(key);
    if (!current || (trait.tier ?? 0) > (current.tier ?? 0)) {
      result.set(key, trait);
    }
  });
  return Array.from(result.values());
}

export function getTraitEffects(traits: CharacterTrait[] | undefined | null, target: TraitEffectTarget): AppliedTraitEffect[] {
  const result: AppliedTraitEffect[] = [];
  getEffectiveTraits(traits).forEach(trait => {
    const effects = TRAIT_EFFECTS[trait.traitId] || [];
    effects
      .filter(effect => effect.target === target)
      .forEach(effect => {
        result.push({
          traitId: trait.traitId,
          specialization: trait.specialization,
          effect,
          value: effect.value * (trait.tier ?? 1),
        });
      });
  });
  return result;
}

export function sumTraitEffects(effects: AppliedTraitEffect[]): number {
  return effects.reduce((sum, e) => sum + e.value, 0);
}
