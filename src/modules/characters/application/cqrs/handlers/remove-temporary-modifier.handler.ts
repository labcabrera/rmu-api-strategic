import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterHealthStore } from '../../services/character-health.store.js';
import { RemoveTemporaryModifierCommand } from '../commands/remove-temporary-modifier.command.js';

/** Only the game owner or an administrator removes a temporary modifier (workspace spec 068, decision 19). */
@CommandHandler(RemoveTemporaryModifierCommand)
export class RemoveTemporaryModifierHandler implements ICommandHandler<RemoveTemporaryModifierCommand, Character> {
  constructor(private readonly store: CharacterHealthStore) {}

  async execute(command: RemoveTemporaryModifierCommand): Promise<Character> {
    const character = await this.store.load(command.characterId, command.userId, command.roles, { allowCharacterOwner: false });
    character.removeTemporaryModifier(command.modifierId);
    return this.store.save(character);
  }
}
