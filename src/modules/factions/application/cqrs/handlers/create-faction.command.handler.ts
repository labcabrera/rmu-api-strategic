import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import { ValidationError } from 'src/modules/shared/domain/errors';
import type { GameRepository } from 'src/modules/games/application/ports/game.repository';
import type { FactionRepository } from '../../ports/faction.repository';
import type { FactionEventBusPort } from '../../ports/faction-event-bus.port';
import { CreateFactionCommand } from '../commands/create-faction.command';
import { FactionManagement } from 'src/modules/factions/domain/value-objects/faction-management.vo';

@CommandHandler(CreateFactionCommand)
export class CreateFactionCommandHandler implements ICommandHandler<CreateFactionCommand, Faction> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('FactionEventProducer') private readonly factionEventBus: FactionEventBusPort,
  ) {}

  async execute(command: CreateFactionCommand): Promise<Faction> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new ValidationError('Game not found');
    }
    const faction = Faction.create(
      command.gameId,
      command.name,
      new FactionManagement(command.availableGold || 0, command.availableXP || 0),
      command.shortDescription,
      command.description,
      command.userId,
    );
    const created = await this.factionRepository.save(faction);
    faction.getUncommittedEvents().forEach((event) => this.factionEventBus.publish(event));
    return created;
  }
}
