import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Character } from '../../../domain/aggregates/character.js';
import { HealingCalculator } from '../../../domain/services/healing/healing-calculator.js';
import { type HealingTablesClientPort, HEALING_TABLES_CLIENT } from '../../ports/healing-tables-client.port.js';
import { CharacterHealthStore } from '../../services/character-health.store.js';
import { RestCharacterCommand } from '../commands/rest-character.command.js';
import { restPowerPeriods } from '../../../domain/services/power/power-rules.js';

const HOURS_PER_DAY = 24;

@CommandHandler(RestCharacterCommand)
export class RestCharacterHandler implements ICommandHandler<RestCharacterCommand, Character> {
  constructor(
    private readonly store: CharacterHealthStore,
    @Inject(HEALING_TABLES_CLIENT) private readonly healingTablesClient: HealingTablesClientPort,
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
    const summary = { hours, restDays: days, fullRest: command.fullRest };
    character.rest(hpAfter, counterDays, new Date().toISOString(), summary, restPowerPeriods(hours, days));
    return this.store.save(character);
  }
}
