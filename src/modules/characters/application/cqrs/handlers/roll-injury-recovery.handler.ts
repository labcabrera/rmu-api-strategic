import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors/errors';
import { Character } from '../../../domain/aggregates/character';
import { HealingCalculator } from '../../../domain/services/healing/healing-calculator';
import { type HealingTablesClientPort, HEALING_TABLES_CLIENT } from '../../ports/healing-tables-client.port';
import { CharacterHealthStore } from '../../services/character-health.store';
import { RollInjuryRecoveryCommand } from '../commands/roll-injury-recovery.command';

export interface InjuryRecoveryResult {
  character: Character;
  permanentCheckRequired: boolean;
}

@CommandHandler(RollInjuryRecoveryCommand)
export class RollInjuryRecoveryHandler implements ICommandHandler<RollInjuryRecoveryCommand, InjuryRecoveryResult> {
  constructor(
    private readonly store: CharacterHealthStore,
    @Inject(HEALING_TABLES_CLIENT) private readonly healingTablesClient: HealingTablesClientPort,
  ) {}

  async execute(command: RollInjuryRecoveryCommand): Promise<InjuryRecoveryResult> {
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    if (character.status === 'dead') throw new ValidationError(`Character ${character.id} is dead`, 'err-character-dead');
    const injury = character.findInjury(command.injuryId);
    const calculator = new HealingCalculator(await this.healingTablesClient.getHealingTables());
    const modifiers = calculator.recoveryModifiers(
      { bodyDevelopmentRanks: character.bodyDevelopmentRanks, constitutionBonus: character.statistics.co?.totalBonus ?? 0 },
      injury,
    );
    const multiplier = calculator.recoveryMultiplier(
      character.recoveryMultiplier,
      character.traits.map(t => t.traitId),
    );
    const recovery = calculator.recovery(injury, command.roll, modifiers.total, multiplier, new Date().toISOString());
    const permanentCheckRequired = HealingCalculator.isPermanentCheckRequired(injury.severity, command.roll);
    character.setInjuryRecovery(injury.id, recovery, permanentCheckRequired);
    return { character: await this.store.save(character), permanentCheckRequired };
  }
}
