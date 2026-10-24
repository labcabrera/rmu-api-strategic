import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { GameController } from './interfaces/http/game.controller';
import { MongoGameRepository } from './infrastructure/db/mongo.game.repository';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game.model';
import { ApiRealmClientAdapter } from './infrastructure/api-clients/api.realm-client.adapter';
import { CreateGameHandler } from './application/cqrs/handlers/create-game.handler';
import { DeleteGameHandler } from './application/cqrs/handlers/delete-game.handler';
import { GetGameHandler } from './application/cqrs/handlers/get-game.handler';
import { GetGamesHandler } from './application/cqrs/handlers/get-games.handler';
import { UpdateGameHandler } from './application/cqrs/handlers/update-game.handler';
import { KafkaRealmEventConsumer } from './interfaces/messaging/kafka.realm-event-consumer';
import { GameGuardAdapter } from './infrastructure/security/game-guard.adapter';

import { GAME_GUARD } from './application/ports/game-guard.port';
import { GAME_REPOSITORY } from './application/ports/game-repository.port';
import { REALM_CLIENT } from './application/ports/realm-client.port';
@Module({
  imports: [TerminusModule, CqrsModule, MongooseModule.forFeature([{ name: GameModel.name, schema: GameSchema }]), SharedModule],
  controllers: [GameController, KafkaRealmEventConsumer],
  providers: [
    GetGameHandler,
    GetGamesHandler,
    CreateGameHandler,
    UpdateGameHandler,
    DeleteGameHandler,
    {
      provide: GAME_REPOSITORY,
      useClass: MongoGameRepository,
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
  exports: [GAME_REPOSITORY],
})
export class GamesModule {}
