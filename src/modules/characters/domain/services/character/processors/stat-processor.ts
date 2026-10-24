import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character';
import { CharacterStat, STAT_KEYS } from '../../../value-objects/character-stat.vo';
import { getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver';
import { matchesKey } from '../traits/trait-specialization-matcher';
import { getStatBonus } from '../../stats/stat-rules';

@Injectable()
export class StatProcessor {
  process(character: Character): void {
    const statEffects = getTraitEffects(character.traits, 'stat');
    for (const key of STAT_KEYS) {
      const prev = character.statistics[key];
      const traitBonus = sumTraitEffects(statEffects.filter(e => matchesKey(e.specialization, key)));
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
