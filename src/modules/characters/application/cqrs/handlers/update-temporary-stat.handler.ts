import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { UpdateTemporaryStatCommand } from '../commands/update-temporary-stat.command.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { loadGameRules } from '../../services/game-rules.js';

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
    await this.characterRepository.update(character);
    //TODO propagate events
    return character;
  }
}
