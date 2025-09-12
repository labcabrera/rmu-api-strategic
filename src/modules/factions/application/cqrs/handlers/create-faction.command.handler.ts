import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Faction } from 'src/modules/factions/domain/entities/faction.entity';
import { ValidationError } from 'src/modules/shared/domain/errors';
import type { GameRepository } from 'src/modules/games/application/ports/game.repository';
import type { FactionRepository } from '../../ports/out/faction-repository';
import type { FactionEventProducer } from '../../ports/out/game-event-producer';
import { CreateFactionCommand } from '../commands/create-faction.command';

@CommandHandler(CreateFactionCommand)
export class CreateFactionCommandHandler implements ICommandHandler<CreateFactionCommand, Faction> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('FactionEventProducer') private readonly factionNotificationPort: FactionEventProducer,
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
