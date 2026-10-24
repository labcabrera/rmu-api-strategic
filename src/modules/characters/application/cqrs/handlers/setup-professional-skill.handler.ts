import { CharacterAccess } from '../../services/character-access.service.js';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { SetUpProfessionalSkillCommand } from '../commands/setup-professional-skill.command.js';
import { CharacterSkill } from '../../../infrastructure/persistence/models/character-skill.model.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { loadGameRules } from '../../services/game-rules.js';

@CommandHandler(SetUpProfessionalSkillCommand)
export class SetupProfessionSkillHandler implements ICommandHandler<SetUpProfessionalSkillCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly characterAccess: CharacterAccess,
  ) {}

  async execute(command: SetUpProfessionalSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;
    const character = await this.characterRepository.findById(command.characterId);

    if (!character) throw new NotFoundError('Character', characterId);
    // Its owner, the owner of its game or an admin (F-strategic-15).
    await this.characterAccess.checkChange(character, command.userId, command.roles);

    const skill = character.findSkill(skillId, command.specialization);
    if (!skill) throw new Error(`Skill ${skillId} not found for character ${characterId}`);

    const { powerLevel } = await loadGameRules(this.gameRepository, character.gameId);
    this.validateCount(command.types, skill, character, powerLevel.knackCount);
    // The knack bonus is taken from the power level when the knack is assigned
    if (command.types.includes('knack') && !skill.professional?.includes('knack')) {
      skill.knackBonus = powerLevel.knackBonus;
    }
    skill.professional = command.types;
    const items = await this.itemRepository.findByCharacterId(characterId);
    this.characterProcessorService.process(character, items);
    const updated: Character = await this.characterRepository.update(character);
    return updated;
  }

  private validateCount(types: string[], skill: CharacterSkill, character: Character, knackCount: number): void {
    if (types.length === 0) return;
    if (types.includes('professional') && !skill.professional?.includes('professional')) {
      const count = character.skills.filter(skill => skill.professional?.includes('professional')).length;
      if (count >= 10) {
        throw new ValidationError(`Character ${character.id} cannot have more than 10 professional skills`);
      }
    }
    if (types.includes('knack') && !skill.professional?.includes('knack')) {
      const count = character.skills.filter(skill => skill.professional?.includes('knack')).length;
      if (count >= knackCount) {
        throw new ValidationError(`Character ${character.id} cannot have more than ${knackCount} knack skills`, 'err-skill-max-knacks');
      }
    }
  }
}
