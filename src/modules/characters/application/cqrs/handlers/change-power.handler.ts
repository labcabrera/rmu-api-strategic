import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterHealthStore } from '../../services/character-health.store.js';
import { ChangePowerCommand } from '../commands/change-power.command.js';

/** Spends or gives back power points: the character owner, the game owner, an admin or another service (tactical). */
@CommandHandler(ChangePowerCommand)
export class ChangePowerHandler implements ICommandHandler<ChangePowerCommand, Character> {
  constructor(private readonly store: CharacterHealthStore) {}

  async execute(command: ChangePowerCommand): Promise<Character> {
    const character = await this.store.load(command.characterId, command.userId, command.roles, {
      allowCharacterOwner: true,
      allowService: true,
    });
    if (command.change === 'spend') character.spendPower(command.amount);
    else character.restorePower(command.amount);
    return this.store.save(character);
  }
}
