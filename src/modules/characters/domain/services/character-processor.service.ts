import { Injectable } from '@nestjs/common';

import { Character } from '../aggregates/character.js';
import { AttackProcessor } from './character/processors/attack-processor.js';
import { DefenseProcessor } from './character/processors/defense-processor.js';
import { EquipmentProcessor } from './character/processors/equipment-processor.js';
import { HPProcessor } from './character/processors/hp-processor.js';
import { InitiativeProcessor } from './character/processors/initiative-processor.js';
import { MovementProcessor } from './character/processors/movement-processor.js';
import { PowerProcessor } from './character/processors/power-processor.js';
import { SkillProcessor } from './character/processors/skill-processor.js';
import { StatProcessor } from './character/processors/stat-processor.js';
import { XPProcessor } from './character/processors/xp-processor.js';
import { ResistancesProcessor } from './character/processors/resistances-processor.js';
import { Item } from '../../../items/domain/aggregates/item.js';

@Injectable()
export class CharacterProcessorService {
  constructor(
    private readonly statProcessor: StatProcessor,
    private readonly movementProcessor: MovementProcessor,
    private readonly initiativeProcessor: InitiativeProcessor,
    private readonly skillProcessor: SkillProcessor,
    private readonly equipmentProcessor: EquipmentProcessor,
    private readonly hpProcessor: HPProcessor,
    private readonly powerProcessor: PowerProcessor,
    private readonly defenseProcessor: DefenseProcessor,
    private readonly xpProcessor: XPProcessor,
    private readonly attackProcessor: AttackProcessor,
    private readonly resistancesProcessor: ResistancesProcessor,
  ) {}

  process(character: Character, items: Item[]): void {
    this.statProcessor.process(character);
    this.initiativeProcessor.process(character);
    this.skillProcessor.process(character, items);
    this.equipmentProcessor.process(character, items);
    this.attackProcessor.process(character, items);
    this.movementProcessor.process(character);
    this.hpProcessor.process(character);
    this.powerProcessor.process(character);
    this.defenseProcessor.process(character, items);
    this.resistancesProcessor.process(character);
    this.xpProcessor.process(character);
  }
}
