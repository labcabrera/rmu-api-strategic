import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { SetUpProfessionalSkillCommand } from '../commands/setup-professional-skill.command';
import { CharacterSkill } from 'src/modules/characters/infrastructure/persistence/models/character-skill.model';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';
import type { GameRepository } from 'src/modules/games/application/ports/game.repository';
import { loadGameRules } from '../../services/game-rules';

@CommandHandler(SetUpProfessionalSkillCommand)
export class SetupProfessionSkillHandler implements ICommandHandler<SetUpProfessionalSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: SetUpProfessionalSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;
    const character = await this.characterRepository.findById(command.characterId);

    if (!character) throw new NotFoundError('Character', characterId);

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
    const updated: Character = await this.characterRepository.update(character.id, character);
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
