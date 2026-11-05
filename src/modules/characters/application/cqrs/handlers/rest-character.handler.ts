import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterHealthStore } from '../../services/character-health.store.js';
import { CharacterRestService } from '../../services/character-rest.service.js';
import { RestCharacterCommand } from '../commands/rest-character.command.js';

@CommandHandler(RestCharacterCommand)
export class RestCharacterHandler implements ICommandHandler<RestCharacterCommand, Character> {
  constructor(
    private readonly store: CharacterHealthStore,
    private readonly restService: CharacterRestService,
  ) {}

  async execute(command: RestCharacterCommand): Promise<Character> {
    CharacterRestService.checkTime(command.hours, command.days, command.minutes);
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    // A rest of one character does not move the calendar: the modifiers expired by the current day are dropped
    const currentGameDay = await this.store.currentGameDay(character);
    await this.restService.apply(character, {
      minutes: command.minutes,
      hours: command.hours,
      days: command.days,
      fullRest: command.fullRest,
      active: command.active,
      currentGameDay,
    });
    return this.store.save(character);
  }
}
