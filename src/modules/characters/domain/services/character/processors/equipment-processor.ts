import { Injectable } from '@nestjs/common';
import { Character } from '../../../entities/character.entity';

@Injectable()
export class EquipmentProcessor {
  process(character: Partial<Character>): void {
    if (!character.items || character.items.length === 0 || !character.equipment) {
      return;
    }
    const total = character.items.reduce((sum, item) => sum + item.info.weight, 0);
    character.equipment.weight = total;
    this.sortItems(character);
  }

  private sortItems(character: Partial<Character>) {
    const categoryOrder = ['weapon', 'shield', 'armor', 'clothes'];
    character.items!.sort((a, b) => {
      const aCatIdx = categoryOrder.indexOf(a.category);
      const bCatIdx = categoryOrder.indexOf(b.category);
      if (aCatIdx !== -1 && bCatIdx !== -1) {
        if (aCatIdx !== bCatIdx) return aCatIdx - bCatIdx;
      }
      return a.name.localeCompare(b.name);
    });
  }
}
