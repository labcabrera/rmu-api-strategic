import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import type { GameRepository } from 'src/modules/games/application/ports/game.repository';
import type { FactionRepository } from '../../ports/faction.repository';
import type { FactionEventBusPort } from '../../ports/faction-event-bus.port';
import { CreateFactionCommand } from '../commands/create-faction.command';
import { FactionManagement } from 'src/modules/factions/domain/value-objects/faction-management.vo';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import { CreateFactionProps } from 'src/modules/factions/domain/aggregates/faction-props';

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
    const props = {
      gameId: command.gameId,
      name: command.name,
      management: command.management || new FactionManagement(0, 0),
      shortDescription: command.shortDescription,
      description: command.description,
      imageUrl: command.imageUrl,
      owner: command.userId,
    } as CreateFactionProps;
    const faction = Faction.create(props);
    const created = await this.factionRepository.save(faction);
    faction.getUncommittedEvents().forEach(event => this.factionEventBus.publish(event));
    return created;
  }
}
