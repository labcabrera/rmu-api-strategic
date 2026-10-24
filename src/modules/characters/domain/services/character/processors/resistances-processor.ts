import { Injectable } from '@nestjs/common';

import { Character } from '../../../aggregates/character.aggregate';
import { CharacterResistance, RESISTANCE_BONUS_PER_LEVEL } from '../../../value-objects/character-resistances.vo';
import { AppliedTraitEffect, getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver';
import { matchesKey } from '../traits/trait-specialization-matcher';

@Injectable()
export class ResistancesProcessor {
  process(character: Partial<Character>): void {
    this.setDefaultResistances(character);
    const resistanceEffects = getTraitEffects(character.traits, 'resistance');
    character.resistances!.map(r => this.calculateResistances(character, r.resistance, resistanceEffects));
  }

  private setDefaultResistances(character: Partial<Character>): void {
    if (!character.resistances) {
      character.resistances = [];
    }
    const defaultResistances = ['physical', 'fear', 'channeling', 'essence', 'mentalism'];
    defaultResistances.forEach(resistance => {
      let resistanceEntry = character.resistances?.find(r => r.resistance === resistance);
      if (!resistanceEntry) {
        resistanceEntry = {
          resistance: resistance,
          statBonus: 0,
          racialBonus: 0,
          customBonus: 0,
          traitBonus: 0,
          levelBonus: 0,
          totalBonus: 0,
        } as CharacterResistance;
        character.resistances?.push(resistanceEntry);
      }
    });
  }

  private calculateResistances(character: Partial<Character>, resistance: string, resistanceEffects: AppliedTraitEffect[]): void {
    let re = character.resistances?.find(r => r.resistance === resistance);
    if (!re) {
      re = {
        resistance: resistance,
        statBonus: 0,
        racialBonus: 0,
        realmBonus: 0,
        customBonus: 0,
        traitBonus: 0,
        levelBonus: 0,
        totalBonus: 0,
      };
      character.resistances?.push(re);
    }
    re.realmBonus = this.getRealmBonus(character, resistance);
    re.statBonus = this.getStatusBonus(character, resistance);
    re.traitBonus = this.getTraitBonus(resistance, resistanceEffects);
    re.levelBonus = RESISTANCE_BONUS_PER_LEVEL * (character.experience?.level || 0);
    re.totalBonus = re.statBonus + re.racialBonus + re.realmBonus + (re.customBonus || 0) + re.traitBonus + re.levelBonus;
  }

  private getTraitBonus(resistance: string, resistanceEffects: AppliedTraitEffect[]): number {
    const matching = resistanceEffects.filter(e =>
      e.effect.ids ? e.effect.ids.includes(resistance) : matchesKey(e.specialization, resistance),
    );
    return sumTraitEffects(matching);
  }

  private getStatusBonus(character: Partial<Character>, resistance: string): number {
    switch (resistance) {
      case 'physical':
        return character.statistics?.co.totalBonus || 0;
      case 'fear':
        return character.statistics?.sd.totalBonus || 0;
      case 'channeling':
        return character.statistics?.in.totalBonus || 0;
      case 'essence':
        return character.statistics?.em.totalBonus || 0;
      case 'mentalism':
        return character.statistics?.pr.totalBonus || 0;
      default:
        return 0;
    }
  }

  private getRealmBonus(character: Partial<Character>, resistance: string): number {
    switch (resistance) {
      case 'channeling':
      case 'essence':
      case 'mentalism':
        return character.info?.realmType === resistance ? 10 : 0;
      default:
        return 0;
    }
  }
}
