import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { HealingCalculator } from '../../../domain/services/healing/healing-calculator';
import type { HealingTablesClientPort } from '../../ports/healing-tables-client.port';
import { CharacterHealthStore } from '../../services/character-health.store';
import { RollPermanentInjuryCommand } from '../commands/roll-permanent-injury.command';

@CommandHandler(RollPermanentInjuryCommand)
export class RollPermanentInjuryHandler implements ICommandHandler<RollPermanentInjuryCommand, Character> {
  constructor(
    private readonly store: CharacterHealthStore,
    @Inject('HealingTablesClient') private readonly healingTablesClient: HealingTablesClientPort,
  ) {}

  async execute(command: RollPermanentInjuryCommand): Promise<Character> {
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    const injury = character.findInjury(command.injuryId);
    if (!injury.recovery) {
      throw new ValidationError(`Injury ${injury.id} has no recovery roll`, 'err-injury-recovery-required');
    }
    const calculator = new HealingCalculator(await this.healingTablesClient.getHealingTables());
    // Second recovery roll with the same modifiers as the first one
    const result = calculator.permanentPenalty(injury.initialPenalty, command.roll, injury.recovery.modifiers);
    character.setInjuryPermanent(
      injury.id,
      { penalty: result.penalty, roll: command.roll },
      { total: result.total, result: result.result, fraction: result.fraction },
    );
    return this.store.save(character);
  }
}
