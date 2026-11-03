import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module.js';
import { FactionController } from './interfaces/http/faction.controller.js';
import { MongoFactionRepository } from './infrastructure/db/mongo.faction.repository.js';
import { FactionModel, FactionSchema } from './infrastructure/persistence/models/faction.model.js';
import { GamesModule } from '../games/games.module.js';
import { AddFactionGoldCommandHandler } from './application/cqrs/handlers/add-faction-gold.handler.js';
import { CreateFactionCommandHandler } from './application/cqrs/handlers/create-faction.handler.js';
import { DeleteFactionCommandHandler } from './application/cqrs/handlers/delete-faction.handler.js';
import { GetFactionQueryHandler } from './application/cqrs/handlers/get-faction.handler.js';
import { GetFactionsQueryHandler } from './application/cqrs/handlers/get-factions.handler.js';
import { UpdateFactionHandler } from './application/cqrs/handlers/update-faction.handler.js';
import { DeleteFactionsByGameHandler } from './application/cqrs/handlers/delete-factions-by-game.handler.js';
import { KafkaFactionGameEventConsumer } from './interfaces/messaging/kafka.game-event-consumer.js';

import { FACTION_REPOSITORY } from './application/ports/faction-repository.port.js';
import { FACTION_MEMBERSHIP } from './application/ports/faction-membership.port.js';
import { FactionAccess } from './application/services/faction-access.service.js';
import { MongoFactionMembershipAdapter } from './infrastructure/db/mongo.faction-membership.adapter.js';
import { CharacterModel, CharacterSchema } from '../characters/infrastructure/persistence/models/character.model.js';
import { NPC_CLIENT } from './application/ports/npc-client.port.js';
import { FactionNpcsResolver } from './application/services/faction-npcs.resolver.js';
import { ApiNpcClientAdapter } from './infrastructure/api-clients/api.npc-client.adapter.js';
@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([
      { name: FactionModel.name, schema: FactionSchema },
      { name: CharacterModel.name, schema: CharacterSchema },
    ]),
    SharedModule,
    GamesModule,
  ],
  controllers: [FactionController, KafkaFactionGameEventConsumer],
  providers: [
    GetFactionQueryHandler,
    GetFactionsQueryHandler,
    CreateFactionCommandHandler,
    UpdateFactionHandler,
    DeleteFactionCommandHandler,
    DeleteFactionsByGameHandler,
    AddFactionGoldCommandHandler,
    FactionNpcsResolver,
    FactionAccess,
    { provide: FACTION_MEMBERSHIP, useClass: MongoFactionMembershipAdapter },
    { provide: NPC_CLIENT, useClass: ApiNpcClientAdapter },
    {
      provide: FACTION_REPOSITORY,
      useClass: MongoFactionRepository,
    },
  ],
  exports: [FACTION_REPOSITORY, FactionNpcsResolver, FactionAccess],
})
export class FactionsModule {}
