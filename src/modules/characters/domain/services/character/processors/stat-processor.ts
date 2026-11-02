import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.js';
import { CharacterStat, STAT_KEYS } from '../../../value-objects/character-stat.vo.js';
import { getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver.js';
import { matchesKey } from '../traits/trait-specialization-matcher.js';
import { getStatBonus } from '../../stats/stat-rules.js';

@Injectable()
export class StatProcessor {
  process(character: Character): void {
    const statEffects = getTraitEffects(character.traits, 'stat');
    for (const key of STAT_KEYS) {
      const prev = character.statistics[key];
      const traitBonus = sumTraitEffects(
        statEffects.filter(e => (e.effect.ids ? e.effect.ids.includes(key) : matchesKey(e.specialization, key))),
      );
      const processed = this.processStat(prev, traitBonus);
      character.statistics[key] = processed;
    }
  }

  private processStat(stat: CharacterStat, traitBonus: number) {
    const bonus = this.getBonus(stat.temporary);
    const modifiers = { ...stat.modifiers, stat: bonus, trait: traitBonus };
    if (traitBonus === 0) {
      delete (modifiers as Partial<typeof modifiers>).trait;
    }
    return CharacterStat.fromModifiers(stat.potential, stat.temporary, modifiers);
  }

  private getBonus(temporary: number | undefined): number {
    return getStatBonus(temporary);
  }
}
