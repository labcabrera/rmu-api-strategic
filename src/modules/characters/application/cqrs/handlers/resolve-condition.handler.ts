import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterHealthStore } from '../../services/character-health.store';
import { ResolveConditionCommand } from '../commands/resolve-condition.command';

@CommandHandler(ResolveConditionCommand)
export class ResolveConditionHandler implements ICommandHandler<ResolveConditionCommand, Character> {
  constructor(private readonly store: CharacterHealthStore) {}

  async execute(command: ResolveConditionCommand): Promise<Character> {
    const character = await this.store.load(command.characterId, command.userId, command.roles, { allowCharacterOwner: false });
    character.resolveCondition(command.conditionId);
    return this.store.save(character);
  }
}
