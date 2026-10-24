import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port';
import { UpdateTemporaryStatCommand } from '../commands/update-temporary-stat.command';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port';
import { loadGameRules } from '../../services/game-rules';

@CommandHandler(UpdateTemporaryStatCommand)
export class UpdateTemporaryStatHandler implements ICommandHandler<UpdateTemporaryStatCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: UpdateTemporaryStatCommand): Promise<Character> {
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', command.characterId);

    const stat = character.statistics[command.stat];
    if (!stat) {
      throw new ValidationError(`Stat ${command.stat} not found for character ${command.characterId}`);
    }
    const { powerLevel } = await loadGameRules(this.gameRepository, character.gameId);
    character.updateTemporaryStat(command.stat, command.value, { bonusDevPointsPerLevel: powerLevel.raceDevPointsPerLevel });
    const items = await this.itemRepository.findByCharacterId(command.characterId);
    this.characterProcessorService.process(character, items);
    await this.characterRepository.update(character.id, character);
    //TODO propagate events
    return character;
  }
}
