import { Injectable } from '@nestjs/common';
import { Character } from '../../../entities/character.entity';

@Injectable()
export class XPProcessor {
  process(character: Partial<Character>): void {
    if (!character.experience) {
      return;
    }
    character.experience.availableLevel = Math.floor(character.experience.xp / 10000);
  }
}
