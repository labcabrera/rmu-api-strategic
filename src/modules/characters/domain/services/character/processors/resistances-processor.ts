import { Injectable } from '@nestjs/common';

import { Character } from '../../../entities/character.entity';
import { CharacterResistance } from '../../../entities/character-resistances.entity';

@Injectable()
export class ResistancesProcessor {
  process(character: Partial<Character>): void {
    this.setDefaultResistances(character);
    character.resistances!.map((r) => this.calculateResistances(character, r.resistance));
  }

  private setDefaultResistances(character: Partial<Character>): void {
    if (!character.resistances) {
      character.resistances = [];
    }
    const defaultResistances = ['physical', 'fear', 'channeling', 'essence', 'mentalism'];
    defaultResistances.forEach((resistance) => {
      let resistanceEntry = character.resistances?.find((r) => r.resistance === resistance);
      if (!resistanceEntry) {
        resistanceEntry = {
          resistance: resistance,
          statBonus: 0,
          racialBonus: 0,
          customBonus: 0,
          totalBonus: 0,
        } as CharacterResistance;
        character.resistances?.push(resistanceEntry);
      }
    });
  }

  private calculateResistances(character: Partial<Character>, resistance: string): void {
    let re = character.resistances?.find((r) => r.resistance === resistance);
    if (!re) {
      re = {
        resistance: resistance,
        statBonus: 0,
        racialBonus: 0,
        realmBonus: 0,
        customBonus: 0,
        totalBonus: 0,
      } as CharacterResistance;
      character.resistances?.push(re);
    }
    re.realmBonus = this.getRealmBonus(character, resistance);
    re.statBonus = this.getStatusBonus(character, resistance);
    re.totalBonus = re.statBonus + re.racialBonus + re.realmBonus + re.customBonus;
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
