import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../auth/auth.module';

import { SharedModule } from '../shared/shared.module';
import { FactionController } from './infrastructure/controllers/faction.controller';
import { GetFactionsQueryHandler } from './application/queries/handlers/get-factions.query.handler';
import { GetFactionQueryHandler } from './application/queries/handlers/get-faction.query.handler';
import { CreateFactionCommandHandler } from './application/commands/handlers/create-faction.command.handler';
import { UpdateFactionCommandHandler } from './application/commands/handlers/update-faction.command.handler';
import { DeleteFactionCommandHandler } from './application/commands/handlers/delete-faction.command.handler';
import { MongoFactionRepository } from './infrastructure/persistence/repositories/mongo-faction.repository';
import { KafkaFactionProducerService } from './infrastructure/messaging/kafka-faction-producer.service';
import { FactionModel, FactionSchema } from './infrastructure/persistence/models/faction.model';
import { GamesModule } from '../games/games.module';
import { AddFactionGoldCommandHandler } from './application/commands/handlers/add-faction-gold.command.handler';
import { AddFactionXPCommandHandler } from './application/commands/handlers/add-faction-xp.command.handler';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([{ name: FactionModel.name, schema: FactionSchema }]),
    AuthModule,
    SharedModule,
    GamesModule,
  ],
  controllers: [FactionController],
  providers: [
    GetFactionQueryHandler,
    GetFactionsQueryHandler,
    CreateFactionCommandHandler,
    UpdateFactionCommandHandler,
    DeleteFactionCommandHandler,
    AddFactionGoldCommandHandler,
    AddFactionXPCommandHandler,
    {
      provide: 'FactionRepository',
      useClass: MongoFactionRepository,
    },
    {
      provide: 'FactionEventProducer',
      useClass: KafkaFactionProducerService,
    },
  ],
  exports: ['FactionRepository'],
})
export class FactionsModule {}
