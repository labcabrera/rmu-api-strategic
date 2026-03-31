import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { TransferGoldCommand } from '../commands/transfer-gold.command';
import { CharacterItem } from 'src/modules/characters/domain/value-objects/character-item.vo';
import { randomUUID } from 'crypto';
import type { CharacterRepository } from '../../ports/character.repository';
import type { FactionRepository } from 'src/modules/factions/application/ports/faction.repository';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(TransferGoldCommand)
export class TransferGoldHandler implements ICommandHandler<TransferGoldCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
  ) {}

  async execute(command: TransferGoldCommand): Promise<Character> {
    if (command.amount === 0) {
      throw new ValidationError(`Gold amount cannot be zero`);
    }
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const faction = await this.factionRepository.findById(character.faction.id);
    if (!faction) throw new NotFoundError('Faction', character.faction.id);

    faction.management.availableGold -= command.amount;
    const goldCoins = character.items.find((item) => item.itemTypeId === 'gold-coin');
    if (command.amount < 0) {
      if (!goldCoins) {
        throw new NotFoundError('Gold coins', character.id);
      }
      if (goldCoins.amount! < command.amount) {
        throw new ValidationError(`Insufficient gold coins: ${goldCoins.amount}`);
      }
    }
    if (goldCoins) {
      if (!goldCoins.amount) {
        goldCoins.amount = 0;
      }
      goldCoins.amount += command.amount;
    } else {
      const goldCoins = {
        id: randomUUID(),
        name: 'Gold coins',
        itemTypeId: 'gold-coin',
        category: 'coins',
        carried: true,
        info: {
          weight: 0,
        },
        stackable: true,
        amount: command.amount,
      } as CharacterItem;
      character.items.push(goldCoins);
    }

    if (faction.management.availableGold < 0) {
      throw new ValidationError(`Insuficient faction gold`);
    }
    if (goldCoins!.amount! < 0) {
      throw new ValidationError(`Insuficient character gold amount`);
    }

    this.characterProcessorService.process(character);
    const updated = await this.characterRepository.update(character.id, character);
    await this.factionRepository.update(faction.id, faction);
    return updated;
  }
}
