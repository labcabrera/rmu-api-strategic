import { CharacterModel, CharacterSchema } from '../characters/infrastructure/persistence/models/character.model.js';
import { GAME_PLAYERS } from './application/ports/game-players.port.js';
import { MongoGamePlayersAdapter } from './infrastructure/db/mongo.game-players.adapter.js';
import { GameAccess } from './application/services/game-access.service.js';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module.js';
import { GameController } from './interfaces/http/game.controller.js';
import { MongoGameRepository } from './infrastructure/db/mongo.game.repository.js';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game.model.js';
import { ApiRealmClientAdapter } from './infrastructure/api-clients/api.realm-client.adapter.js';
import { CreateGameHandler } from './application/cqrs/handlers/create-game.handler.js';
import { DeleteGameHandler } from './application/cqrs/handlers/delete-game.handler.js';
import { DeleteGamesByRealmHandler } from './application/cqrs/handlers/delete-games-by-realm.handler.js';
import { GetGameHandler } from './application/cqrs/handlers/get-game.handler.js';
import { GetGamesHandler } from './application/cqrs/handlers/get-games.handler.js';
import { UpdateGameHandler } from './application/cqrs/handlers/update-game.handler.js';
import { KafkaRealmEventConsumer } from './interfaces/messaging/kafka.realm-event-consumer.js';
import { GameGuardAdapter } from './infrastructure/security/game-guard.adapter.js';

import { GAME_GUARD } from './application/ports/game-guard.port.js';
import { GAME_REPOSITORY } from './application/ports/game-repository.port.js';
import { REALM_CLIENT } from './application/ports/realm-client.port.js';
@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([
      { name: GameModel.name, schema: GameSchema },
      // The players of a game (GamePlayersPort)
      { name: CharacterModel.name, schema: CharacterSchema },
    ]),
    SharedModule,
  ],
  controllers: [GameController, KafkaRealmEventConsumer],
  providers: [
    GetGameHandler,
    GetGamesHandler,
    CreateGameHandler,
    UpdateGameHandler,
    DeleteGameHandler,
    DeleteGamesByRealmHandler,
    GameAccess,
    {
      provide: GAME_REPOSITORY,
      useClass: MongoGameRepository,
    },
    {
      provide: REALM_CLIENT,
      useClass: ApiRealmClientAdapter,
    },
    {
      provide: GAME_PLAYERS,
      useClass: MongoGamePlayersAdapter,
    },
    {
      provide: GAME_GUARD,
      useClass: GameGuardAdapter,
    },
  ],
  exports: [GAME_REPOSITORY, GameAccess],
})
export class GamesModule {}
