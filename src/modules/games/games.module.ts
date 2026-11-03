import { GameAccess } from './application/services/game-access.service.js';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module.js';
import { GameController } from './interfaces/http/game.controller.js';
import { MongoGameRepository } from './infrastructure/db/mongo.game.repository.js';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game.model.js';
import { GameTimeLogModel, GameTimeLogSchema } from './infrastructure/persistence/models/game-time-log.model.js';
import { MongoGameTimeLogRepository } from './infrastructure/db/mongo.game-time-log.repository.js';
import { GAME_TIME_LOG_REPOSITORY } from './application/ports/game-time-log-repository.port.js';
import { GetGameTimeLogHandler } from './application/cqrs/handlers/get-game-time-log.handler.js';
import { ApiRealmClientAdapter } from './infrastructure/api-clients/api.realm-client.adapter.js';
import { CreateGameHandler } from './application/cqrs/handlers/create-game.handler.js';
import { DeleteGameHandler } from './application/cqrs/handlers/delete-game.handler.js';
import { DeleteGamesByRealmHandler } from './application/cqrs/handlers/delete-games-by-realm.handler.js';
import { GetGameHandler } from './application/cqrs/handlers/get-game.handler.js';
import { GetGamesHandler } from './application/cqrs/handlers/get-games.handler.js';
import { UpdateGameHandler } from './application/cqrs/handlers/update-game.handler.js';
import { KafkaRealmEventConsumer } from './interfaces/messaging/kafka.realm-event-consumer.js';
import { GameGuardAdapter } from './infrastructure/security/game-guard.adapter.js';

import {
  ApproveJoinRequestHandler,
  GetGameMembersHandler,
  RemoveGameMemberHandler,
  RemoveJoinRequestHandler,
  RequestJoinGameHandler,
  SetGameMemberHandler,
} from './application/cqrs/handlers/game-members.handlers.js';
import { GameRealmService } from './application/services/game-realm.service.js';
import { USERS_CLIENT } from './application/ports/users-client.port.js';
import { ApiUsersClientAdapter } from './infrastructure/api-clients/api.users-client.adapter.js';
import { GAME_GUARD } from './application/ports/game-guard.port.js';
import { GAME_REPOSITORY } from './application/ports/game-repository.port.js';
import { REALM_CLIENT } from './application/ports/realm-client.port.js';
@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([
      { name: GameModel.name, schema: GameSchema },
      { name: GameTimeLogModel.name, schema: GameTimeLogSchema },
    ]),
    SharedModule,
  ],
  controllers: [GameController, KafkaRealmEventConsumer],
  providers: [
    GetGameHandler,
    GetGamesHandler,
    GetGameTimeLogHandler,
    CreateGameHandler,
    UpdateGameHandler,
    DeleteGameHandler,
    DeleteGamesByRealmHandler,
    SetGameMemberHandler,
    RemoveGameMemberHandler,
    RequestJoinGameHandler,
    ApproveJoinRequestHandler,
    RemoveJoinRequestHandler,
    GetGameMembersHandler,
    GameAccess,
    GameRealmService,
    {
      provide: USERS_CLIENT,
      useClass: ApiUsersClientAdapter,
    },
    {
      provide: GAME_REPOSITORY,
      useClass: MongoGameRepository,
    },
    {
      provide: GAME_TIME_LOG_REPOSITORY,
      useClass: MongoGameTimeLogRepository,
    },
    {
      provide: REALM_CLIENT,
      useClass: ApiRealmClientAdapter,
    },
    {
      provide: GAME_GUARD,
      useClass: GameGuardAdapter,
    },
  ],
  exports: [GAME_REPOSITORY, GAME_TIME_LOG_REPOSITORY, GameAccess, GameRealmService, REALM_CLIENT, USERS_CLIENT],
})
export class GamesModule {}
