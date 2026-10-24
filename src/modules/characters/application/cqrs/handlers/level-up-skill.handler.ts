import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { LevelUpSkillCommand } from '../commands/level-up-skill.command';
import type { SkillClientPort } from '../../ports/skill-client.port';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import type { ItemRepository } from '../../../../items/application/ports/item.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { loadGameRules } from '../../services/game-rules';

@CommandHandler(LevelUpSkillCommand)
export class LevelUpSkillHandler implements ICommandHandler<LevelUpSkillCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('SkillClient') private readonly skillClient: SkillClientPort,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: LevelUpSkillCommand): Promise<Character> {
    const characterId = command.characterId;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const { powerLevel, options } = await loadGameRules(this.gameRepository, character.gameId);
    character.levelUpSkill(command.skillId, command.specialization, {
      allowThirdRank: options.allowThirdRank,
      bonusDevPointsPerLevel: powerLevel.raceDevPointsPerLevel,
    });
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    await this.characterRepository.update(character.id, character);
    //TODO propagate events
    return character;
  }
}
