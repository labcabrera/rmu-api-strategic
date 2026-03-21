import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { SetUpProfessionalSkillCommand } from '../commands/setup-professional-skill.command';
import { CharacterSkill } from 'src/modules/characters/infrastructure/persistence/models/character-skill.model';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(SetUpProfessionalSkillCommand)
export class SetupProfessionSkillHandler implements ICommandHandler<SetUpProfessionalSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
  ) {}

  async execute(command: SetUpProfessionalSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;
    const character = await this.characterRepository.findById(command.characterId);

    if (!character) throw new NotFoundError('Character', characterId);

    const skill = character.skills.find((skill) => skill.skillId === skillId && skill.specialization === command.specialization) || null;
    if (!skill) throw new Error(`Skill ${skillId} not found for character ${characterId}`);

    this.validateCount(command.types, skill, character);
    skill.professional = command.types;
    this.characterProcessorService.process(character);
    const updated: Character = await this.characterRepository.update(character.id, character);
    return updated;
  }

  private validateCount(types: string[], skill: CharacterSkill, character: Character): void {
    if (types.length === 0) return;
    if (types.includes('professional') && !skill.professional?.includes('professional')) {
      const count = character.skills.filter((skill) => skill.professional?.includes('professional')).length;
      if (count >= 10) {
        throw new ValidationError(`Character ${character.id} cannot have more than 10 professional skills`);
      }
    }
    if (types.includes('knack') && !skill.professional?.includes('knack')) {
      const count = character.skills.filter((skill) => skill.professional?.includes('knack')).length;
      if (count >= 2) {
        throw new ValidationError(`Character ${character.id} cannot have more than 2 knack skills`);
      }
    }
  }
}
