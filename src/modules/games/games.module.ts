import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../auth/auth.module';

import { SharedModule } from '../shared/shared.module';
import { CreateGameCommandHandler } from './application/commands/handlers/create-game.command.handler';
import { GetGameQueryHandler } from './application/queries/handlers/get-game.query.handler';
import { GetGamesQueryHandler } from './application/queries/handlers/get-games.query.handler';
import { UpdateGameCommandHandler } from './application/commands/handlers/update-game.command.handler';
import { DeleteGameCommandHandler } from './application/commands/handlers/delete-game.command.handler';
import { GameController } from './infrastructure/controllers/game.controller';
import { KafkaGameProducerService } from './infrastructure/messaging/kafka-game-producer.service';
import { MongoGameRepository } from './infrastructure/persistence/repositories/mongo-game.repository';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game-model';

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
      provide: 'GameEventProducer',
      useClass: KafkaGameProducerService,
    },
  ],
  exports: ['GameRepository'],
})
export class GamesModule {}
