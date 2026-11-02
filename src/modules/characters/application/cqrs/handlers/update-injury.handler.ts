import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterHealthStore } from '../../services/character-health.store.js';
import { UpdateInjuryCommand } from '../commands/update-injury.command.js';

@CommandHandler(UpdateInjuryCommand)
export class UpdateInjuryHandler implements ICommandHandler<UpdateInjuryCommand, Character> {
  constructor(private readonly store: CharacterHealthStore) {}

  async execute(command: UpdateInjuryCommand): Promise<Character> {
    const character = await this.store.load(command.characterId, command.userId, command.roles, { allowCharacterOwner: false });
    character.updateInjury(command.injuryId, command.changes);
    return this.store.save(character);
  }
}
