import { Injectable } from '@nestjs/common';

import { Character } from '../aggregates/character.aggregate';
import { AttackProcessor } from './character/processors/attack-processor';
import { DefenseProcessor } from './character/processors/defense-processor';
import { EquipmentProcessor } from './character/processors/equipment-processor';
import { HPProcessor } from './character/processors/hp-processor';
import { InitiativeProcessor } from './character/processors/initiative-processor';
import { MovementProcessor } from './character/processors/movement-processor';
import { SkillProcessor } from './character/processors/skill-processor';
import { StatProcessor } from './character/processors/stat-processor';
import { XPProcessor } from './character/processors/xp-processor';
import { ResistancesProcessor } from './character/processors/resistances-processor';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';

@Injectable()
export class CharacterProcessorService {
  constructor(
    private readonly statProcessor: StatProcessor,
    private readonly movementProcessor: MovementProcessor,
    private readonly initiativeProcessor: InitiativeProcessor,
    private readonly skillProcessor: SkillProcessor,
    private readonly equipmentProcessor: EquipmentProcessor,
    private readonly hpProcessor: HPProcessor,
    private readonly defenseProcessor: DefenseProcessor,
    private readonly xpProcessor: XPProcessor,
    private readonly attackProcessor: AttackProcessor,
    private readonly resistancesProcessor: ResistancesProcessor,
  ) {}

  process(character: Character, items: Item[]): void {
    this.statProcessor.process(character);
    this.movementProcessor.process(character);
    this.initiativeProcessor.process(character);
    this.skillProcessor.process(character);
    this.attackProcessor.process(character, items);
    this.equipmentProcessor.process(character, items);
    this.hpProcessor.process(character);
    this.defenseProcessor.process(character, items);
    this.resistancesProcessor.process(character);
    this.xpProcessor.process(character);
  }
}
