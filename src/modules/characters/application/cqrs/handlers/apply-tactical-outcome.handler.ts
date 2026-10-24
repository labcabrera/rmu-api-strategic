import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors/errors';
import { Character } from '../../../domain/aggregates/character';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { CharacterHealthStore } from '../../services/character-health.store';
import { TacticalOutcomeItemsMerger } from '../../services/tactical-outcome-items.merger';
import { ApplyTacticalOutcomeCommand } from '../commands/apply-tactical-outcome.command';

@CommandHandler(ApplyTacticalOutcomeCommand)
export class ApplyTacticalOutcomeHandler implements ICommandHandler<ApplyTacticalOutcomeCommand, Character> {
  private readonly logger = new Logger(ApplyTacticalOutcomeHandler.name);

  constructor(
    private readonly store: CharacterHealthStore,
    @Inject(TacticalOutcomeItemsMerger) private readonly itemsMerger: TacticalOutcomeItemsMerger,
    @Inject(CharacterProcessorService) private readonly characterProcessorService: CharacterProcessorService,
  ) {}

  async execute(command: ApplyTacticalOutcomeCommand): Promise<Character> {
    const { outcome } = command;
    if (outcome.characterId && outcome.characterId !== command.characterId) {
      throw new ValidationError(
        `Outcome of character ${outcome.characterId} sent to character ${command.characterId}`,
        'err-outcome-character-mismatch',
      );
    }
    const character = await this.store.load(command.characterId, command.userId, command.roles, { allowService: true });
    if (character.isTacticalGameApplied(outcome.tacticalGameId)) {
      this.logger.log(`Tactical game ${outcome.tacticalGameId} already applied to character ${character.id}`);
      return character;
    }
    // Spec 019: the items first, idempotent by modifier, so a failure saving the character can be retried.
    const { items, summary: itemsSummary } = await this.itemsMerger.merge(character.id, outcome.items || []);
    const summary = character.applyTacticalOutcome(outcome, itemsSummary ? { ...itemsSummary } : undefined);
    if (itemsSummary) {
      this.characterProcessorService.process(character, items);
    }
    this.logger.log(`Tactical game ${outcome.tacticalGameId} applied to character ${character.id}: ${JSON.stringify(summary)}`);
    return this.store.save(character);
  }
}
