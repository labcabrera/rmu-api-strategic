import { CommandHandler, type ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { resolveCalendar } from '../../../domain/value-objects/game-calendar.vo.js';
import { Inject } from '@nestjs/common';
import { Game } from '../../../domain/aggregates/game.js';
import { CreateGameCommand } from '../commands/create-game.command.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { GameRealmService } from '../../services/game-realm.service.js';
import { type GameGuardPort, GAME_GUARD } from '../../ports/game-guard.port.js';
import type { CreateGameProps } from '../../../domain/aggregates/game-props.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(CreateGameCommand)
export class CreateGameHandler implements ICommandHandler<CreateGameCommand, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly gameRealm: GameRealmService,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.gameGuard.checkCreate(command.roles);

    // Spec 071, decision 1: the realm must be one the user reads.
    const realm = await this.gameRealm.checkReadable(command.realmId, command.userId, command.roles);

    const props = {
      name: command.name,
      realmId: realm.id,
      realmName: realm.name,
      options: command.options,
      powerLevel: command.powerLevel,
      shortDescription: command.shortDescription,
      description: command.description,
      imageUrl: command.imageUrl,
      owner: command.userId,
      accessType: command.accessType,
      calendar: resolveCalendar({ startDate: command.startDate }),
    } as CreateGameProps;

    const game = Game.create(props);
    const savedGame = await this.gameRepository.save(game);
    await this.events.publishChanges('game', game);
    return savedGame;
  }
}
