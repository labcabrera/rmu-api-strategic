import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { FactionController } from './interfaces/http/faction.controller';
import { MongoFactionRepository } from './infrastructure/db/mongo.faction.repository';
import { KafkaFactionEventBusAdapter } from './infrastructure/messaging/kafka.faction-event-bus.adapter';
import { FactionModel, FactionSchema } from './infrastructure/persistence/models/faction.model';
import { GamesModule } from '../games/games.module';
import { AddFactionGoldCommandHandler } from './application/cqrs/handlers/add-faction-gold.command.handler';
import { AddFactionXPCommandHandler } from './application/cqrs/handlers/add-faction-xp.command.handler';
import { CreateFactionCommandHandler } from './application/cqrs/handlers/create-faction.command.handler';
import { DeleteFactionCommandHandler } from './application/cqrs/handlers/delete-faction.command.handler';
import { GetFactionQueryHandler } from './application/cqrs/handlers/get-faction.query.handler';
import { GetFactionsQueryHandler } from './application/cqrs/handlers/get-factions.query.handler';
import { UpdateFactionHandler } from './application/cqrs/handlers/update-faction.handler';

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
    UpdateFactionHandler,
    DeleteFactionCommandHandler,
    AddFactionGoldCommandHandler,
    AddFactionXPCommandHandler,
    {
      provide: 'FactionRepository',
      useClass: MongoFactionRepository,
    },
    {
      provide: 'FactionEventProducer',
      useClass: KafkaFactionEventBusAdapter,
    },
  ],
  exports: ['FactionRepository'],
})
export class FactionsModule {}
