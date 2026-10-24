import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { LevelUpSkillCommand } from '../commands/level-up-skill.command';
import { type SkillClientPort, SKILL_CLIENT } from '../../ports/skill-client.port';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port';
import { loadGameRules } from '../../services/game-rules';

@CommandHandler(LevelUpSkillCommand)
export class LevelUpSkillHandler implements ICommandHandler<LevelUpSkillCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(SKILL_CLIENT) private readonly skillClient: SkillClientPort,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
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
