import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterHealthStore } from '../../services/character-health.store';
import { ApplyTacticalOutcomeCommand } from '../commands/apply-tactical-outcome.command';

@CommandHandler(ApplyTacticalOutcomeCommand)
export class ApplyTacticalOutcomeHandler implements ICommandHandler<ApplyTacticalOutcomeCommand, Character> {
  private readonly logger = new Logger(ApplyTacticalOutcomeHandler.name);

  constructor(private readonly store: CharacterHealthStore) {}

  async execute(command: ApplyTacticalOutcomeCommand): Promise<Character> {
    const { outcome } = command;
    if (outcome.characterId && outcome.characterId !== command.characterId) {
      throw new ValidationError(
        `Outcome of character ${outcome.characterId} sent to character ${command.characterId}`,
        'err-outcome-character-mismatch',
      );
    }
    const character = await this.store.load(command.characterId, command.userId, command.roles, { allowService: true });
    const summary = character.applyTacticalOutcome(outcome);
    if (!summary) {
      this.logger.log(`Tactical game ${outcome.tacticalGameId} already applied to character ${character.id}`);
      return character;
    }
    this.logger.log(`Tactical game ${outcome.tacticalGameId} applied to character ${character.id}: ${JSON.stringify(summary)}`);
    return this.store.save(character);
  }
}
