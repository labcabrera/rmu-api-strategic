import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { Character } from '../../../domain/aggregates/character';
import { HealingCalculator } from '../../../domain/services/healing/healing-calculator';
import { Injury } from '../../../domain/value-objects/injury.vo';
import { type HealingTablesClientPort, HEALING_TABLES_CLIENT } from '../../ports/healing-tables-client.port';
import { CharacterHealthStore } from '../../services/character-health.store';
import { AddInjuryCommand } from '../commands/add-injury.command';

@CommandHandler(AddInjuryCommand)
export class AddInjuryHandler implements ICommandHandler<AddInjuryCommand, Character> {
  constructor(
    private readonly store: CharacterHealthStore,
    @Inject(HEALING_TABLES_CLIENT) private readonly healingTablesClient: HealingTablesClientPort,
  ) {}

  async execute(command: AddInjuryCommand): Promise<Character> {
    const character = await this.store.load(command.characterId, command.userId, command.roles, { allowCharacterOwner: false });
    const props = command.injury;
    const penalty = -Math.abs(props.penalty || 0) || 0;
    const severity =
      props.severity ?? new HealingCalculator(await this.healingTablesClient.getHealingTables()).severity(penalty, props.bleeding);
    const injury: Injury = {
      id: randomUUID(),
      type: props.type,
      severity,
      location: props.location,
      side: props.side,
      penalty,
      initialPenalty: penalty,
      bleeding: props.bleeding,
      flags: props.flags,
      description: props.description,
      source: props.source ?? { kind: 'manual' },
      treatments: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    character.addInjury(injury);
    return this.store.save(character);
  }
}
