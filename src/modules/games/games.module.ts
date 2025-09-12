import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { GameController } from './infrastructure/controllers/game.controller';
import { KafkaGameProducerService } from './infrastructure/messaging/kafka-game-producer.service';
import { MongoGameRepository } from './infrastructure/persistence/repositories/mongo-game.repository';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game-model';
import { RealmApiClient } from './infrastructure/clients/realm-api-client';
import { CreateGameCommandHandler } from './application/cqrs/handlers/create-game.command.handler';
import { DeleteGameCommandHandler } from './application/cqrs/handlers/delete-game.command.handler';
import { GetGameQueryHandler } from './application/cqrs/handlers/get-game.query.handler';
import { GetGamesQueryHandler } from './application/cqrs/handlers/get-games.query.handler';
import { UpdateGameCommandHandler } from './application/cqrs/handlers/update-game.command.handler';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([{ name: GameModel.name, schema: GameSchema }]),
    AuthModule,
    SharedModule,
  ],
  controllers: [GameController],
  providers: [
    GetGameQueryHandler,
    GetGamesQueryHandler,
    CreateGameCommandHandler,
    UpdateGameCommandHandler,
    DeleteGameCommandHandler,
    {
      provide: 'GameRepository',
      useClass: MongoGameRepository,
    },
    {
      provide: 'RealmClient',
      useClass: RealmApiClient,
    },
    {
      provide: 'GameEventProducer',
      useClass: KafkaGameProducerService,
    },
  ],
  exports: ['GameRepository'],
})
export class GamesModule {}
