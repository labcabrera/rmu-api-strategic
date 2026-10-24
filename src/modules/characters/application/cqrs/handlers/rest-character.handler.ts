import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { HealingCalculator } from '../../../domain/services/healing/healing-calculator';
import type { HealingTablesClientPort } from '../../ports/healing-tables-client.port';
import { CharacterHealthStore } from '../../services/character-health.store';
import { RestCharacterCommand } from '../commands/rest-character.command';

const HOURS_PER_DAY = 24;

@CommandHandler(RestCharacterCommand)
export class RestCharacterHandler implements ICommandHandler<RestCharacterCommand, Character> {
  constructor(
    private readonly store: CharacterHealthStore,
    @Inject('HealingTablesClient') private readonly healingTablesClient: HealingTablesClientPort,
  ) {}

  async execute(command: RestCharacterCommand): Promise<Character> {
    const hours = Math.max(0, command.hours || 0);
    const days = Math.max(0, command.days || 0);
    if (hours === 0 && days === 0) {
      throw new ValidationError('Rest requires some hours or days', 'err-rest-time-required');
    }
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    if (character.status === 'dead') throw new ValidationError(`Character ${character.id} is dead`, 'err-character-dead');
    const calculator = new HealingCalculator(await this.healingTablesClient.getHealingTables());
    // Whole days count for the injury counters; every hour counts for the hits
    const elapsedDays = days + Math.floor(hours / HOURS_PER_DAY);
    const counterDays = calculator.restDays(elapsedDays, command.fullRest);
    const hpAfter = calculator.restHp(character.hp.max, character.hp.current, hours + days * HOURS_PER_DAY);
    character.rest(hpAfter, counterDays, new Date().toISOString(), { hours, restDays: days, fullRest: command.fullRest });
    return this.store.save(character);
  }
}
