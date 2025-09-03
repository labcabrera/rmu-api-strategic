import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as cr from '../../ports/out/character.repository';
import { TransferGoldCommand } from '../transfer-gold.command';
import * as fr from 'src/modules/factions/application/ports/out/faction-repository';
import { CharacterItem } from 'src/modules/characters/domain/entities/character-item.entity';
import { randomUUID } from 'crypto';

@CommandHandler(TransferGoldCommand)
export class TransferGoldCommandHandler implements ICommandHandler<TransferGoldCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: cr.CharacterRepository,
    @Inject('FactionRepository') private readonly factionRepository: fr.FactionRepository,
  ) {}

  async execute(command: TransferGoldCommand): Promise<Character> {
    if (command.amount === 0) {
      throw new ValidationError(`Invalid gold transfer amount: ${command.amount}`);
    }
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const faction = await this.factionRepository.findById(character.factionId);
    if (!faction) {
      throw new NotFoundError('Faction', character.factionId);
    }
    const factionAvailable = faction.management.availableGold;

    if (command.amount > 0) {
      if (factionAvailable < command.amount) {
        throw new ValidationError(`Insufficient faction gold: ${factionAvailable}`);
      }
      faction.management.availableGold -= command.amount;
    } else {
      faction.management.availableGold += command.amount;
    }

    const goldCoins = character.items.find((item) => item.itemTypeId === 'gold-coin');
    if (command.amount < 0) {
      if (!goldCoins) {
        throw new NotFoundError('Gold coins', character.id);
      }
      if (goldCoins.amount! < command.amount) {
        throw new ValidationError(`Insufficient gold coins: ${goldCoins.amount}`);
      }
      goldCoins.amount! -= command.amount;
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

    this.characterProcessorService.process(character);
    const updated = await this.characterRepository.update(command.characterId, character);
    await this.factionRepository.update(faction.id, faction);
    return updated;
  }
}
