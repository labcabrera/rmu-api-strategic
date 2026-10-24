import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { FactionController } from './interfaces/http/faction.controller';
import { MongoFactionRepository } from './infrastructure/db/mongo.faction.repository';
import { FactionModel, FactionSchema } from './infrastructure/persistence/models/faction.model';
import { GamesModule } from '../games/games.module';
import { AddFactionGoldCommandHandler } from './application/cqrs/handlers/add-faction-gold.handler';
import { AddFactionXPCommandHandler } from './application/cqrs/handlers/add-faction-xp.handler';
import { CreateFactionCommandHandler } from './application/cqrs/handlers/create-faction.handler';
import { DeleteFactionCommandHandler } from './application/cqrs/handlers/delete-faction.handler';
import { GetFactionQueryHandler } from './application/cqrs/handlers/get-faction.handler';
import { GetFactionsQueryHandler } from './application/cqrs/handlers/get-factions.handler';
import { UpdateFactionHandler } from './application/cqrs/handlers/update-faction.handler';

import { FACTION_REPOSITORY } from './application/ports/faction-repository.port';
@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([{ name: FactionModel.name, schema: FactionSchema }]),
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
      provide: FACTION_REPOSITORY,
      useClass: MongoFactionRepository,
    },
  ],
  exports: [FACTION_REPOSITORY],
})
export class FactionsModule {}
