import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import { CreateFactionCommand } from '../create-faction.command';
import { Faction } from 'src/modules/factions/domain/entities/faction.entity';
import * as factionRepository from '../../ports/out/faction-repository';
import * as gameEventProducer from '../../ports/out/game-event-producer';
import * as gr from 'src/modules/games/application/ports/out/game-repository';
import { ValidationError } from 'src/modules/shared/domain/errors';

@CommandHandler(CreateFactionCommand)
export class CreateFactionCommandHandler implements ICommandHandler<CreateFactionCommand, Faction> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: factionRepository.FactionRepository,
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('FactionEventProducer') private readonly factionNotificationPort: gameEventProducer.FactionEventProducer,
  ) {}

  async execute(command: CreateFactionCommand): Promise<Faction> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new ValidationError('Game not found');
    }
    const faction: Partial<Faction> = {
      gameId: command.gameId,
      name: command.name,
      management: {
        availableGold: command.availableGold || 0,
        availableXP: command.availableXP || 0,
      },
      description: command.description,
      owner: command.userId,
      createdAt: new Date(),
    };
    const saved = await this.factionRepository.save(faction);
    await this.factionNotificationPort.created(saved);
    return saved;
  }
}
