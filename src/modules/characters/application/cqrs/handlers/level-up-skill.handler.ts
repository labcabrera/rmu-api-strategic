import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { LevelUpSkillCommand } from '../commands/level-up-skill.command';
import type { SkillClientPort } from '../../ports/skill-client.port';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';

@CommandHandler(LevelUpSkillCommand)
export class LevelUpSkillHandler implements ICommandHandler<LevelUpSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('SkillClient') private readonly skillClient: SkillClientPort,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
  ) {}

  async execute(command: LevelUpSkillCommand): Promise<Character> {
    const characterId = command.characterId;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    //TODO add to game model
    const allowThird = true;
    character.levelUpSkill(command.skillId, command.specialization, allowThird);
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    await this.characterRepository.update(character.id, character);
    //TODO propagate events
    return character;
  }
}
