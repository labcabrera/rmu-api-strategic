import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Faction } from '../../../domain/aggregates/faction.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port.js';
import { CreateFactionCommand } from '../commands/create-faction.command.js';
import { FactionManagement } from '../../../domain/value-objects/faction-management.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { CreateFactionProps } from '../../../domain/aggregates/faction-props.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(CreateFactionCommand)
export class CreateFactionCommandHandler implements ICommandHandler<CreateFactionCommand, Faction> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly gameAccess: GameAccess,
  ) {}

  async execute(command: CreateFactionCommand): Promise<Faction> {
    GameAccess.checkCreateRole(command.roles, 'factions');
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new ValidationError('Game not found');
    }
    // Factions are part of the game: its owner or an admin (F-strategic-16).
    this.gameAccess.checkManage(game, command.userId, command.roles, 'the factions of this game');
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
    await this.events.publishChanges('faction', faction);
    return created;
  }
}
