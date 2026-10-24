import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from '../../../domain/aggregates/game';
import { CreateGameCommand } from '../commands/create-game.command';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { type RealmClientPort, REALM_CLIENT } from '../../ports/realm-client.port';
import { ValidationError } from '../../../../shared/domain/errors/errors';
import { type GameGuardPort, GAME_GUARD } from '../../ports/game-guard.port';
import { CreateGameProps } from '../../../domain/aggregates/game-props';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(CreateGameCommand)
export class CreateGameHandler implements ICommandHandler<CreateGameCommand, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(REALM_CLIENT) private readonly realmClient: RealmClientPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.gameGuard.checkCreate(command.roles);

    const realm = await this.realmClient.getRealmById(command.realmId);
    if (!realm) throw new ValidationError('Realm not found');

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
      accessType: 'private',
    } as CreateGameProps;

    const game = Game.create(props);
    const savedGame = await this.gameRepository.save(game);
    await this.events.publishChanges('game', game);
    return savedGame;
  }
}
