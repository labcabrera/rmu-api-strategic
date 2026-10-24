import { CharacterAccess } from '../../services/character-access.service.js';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { UpdateSkillCommand } from '../commands/update-skill.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';

@CommandHandler(UpdateSkillCommand)
export class UpdateSkillHandler implements ICommandHandler<UpdateSkillCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly characterAccess: CharacterAccess,
  ) {}

  async execute(command: UpdateSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;

    const character = await this.characterRepository.findById(characterId);
    if (!character) throw new NotFoundError('Character', characterId);
    // Its owner, the owner of its game or an admin (F-strategic-15).
    await this.characterAccess.checkChange(character, command.userId, command.roles);

    const skill = character.skills.find(skill => skill.skillId === skillId) || null;
    if (!skill) throw new ValidationError(`Skill ${skillId} not found for character ${characterId}`);

    skill.ranks = command.ranks || skill.ranks;

    const items = await this.itemRepository.findByCharacterId(characterId);
    this.characterProcessorService.process(character, items);
    await this.characterRepository.update(character);
    return character;
  }
}
