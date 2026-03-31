import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { GameController } from './interfaces/http/game.controller';
import { KafkaGameEventBusAdapter } from './infrastructure/messaging/kafka.game-event-bus.adapter';
import { MongoGameRepository } from './infrastructure/db/mongo-game.repository';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game-model';
import { ApiRealmClientAdapter } from './infrastructure/api-clients/api.realm-client.adapter';
import { CreateGameHandler } from './application/cqrs/handlers/create-game.handler';
import { DeleteGameHandler } from './application/cqrs/handlers/delete-game.handler';
import { GetGameHandler } from './application/cqrs/handlers/get-game.handler';
import { GetGamesHandler } from './application/cqrs/handlers/get-games.handler';
import { UpdateGameHandler } from './application/cqrs/handlers/update-game.handler';
import { KafkaRealmEventConsumer } from './interfaces/messaging/kafka.realm-event-consumer';
import { GameGuardAdapter } from './infrastructure/security/game-guard.adapter';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([{ name: GameModel.name, schema: GameSchema }]),
    AuthModule,
    SharedModule,
  ],
  controllers: [GameController, KafkaRealmEventConsumer],
  providers: [
    GetGameHandler,
    GetGamesHandler,
    CreateGameHandler,
    UpdateGameHandler,
    DeleteGameHandler,
    {
      provide: 'GameRepository',
      useClass: MongoGameRepository,
    },
    {
      provide: 'RealmClient',
      useClass: ApiRealmClientAdapter,
    },
    {
      provide: 'GameEventProducer',
      useClass: KafkaGameEventBusAdapter,
    },
    {
      provide: 'GameGuardPort',
      useClass: GameGuardAdapter,
    },
  ],
  exports: ['GameRepository'],
})
export class GamesModule {}
