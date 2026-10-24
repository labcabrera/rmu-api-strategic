import { GamesModule } from '../games/games.module.js';
import { ItemAccess } from './application/services/item-access.service.js';
import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module.js';
import { ItemModel, ItemSchema } from './infrastructure/persistence/models/item.model.js';
import { ItemController } from './interfaces/http/item.controller.js';
import { GetItemHandler } from './application/cqrs/handlers/get-item.handler.js';
import { GetItemsHandler } from './application/cqrs/handlers/get-items.handler.js';
import { CreateItemHandler } from './application/cqrs/handlers/create-item.handler.js';
import { UpdateItemHandler } from './application/cqrs/handlers/update-item.handler.js';
import { MongoItemRepository } from './infrastructure/db/mongo.item.repository.js';
import { ItemGuardAdapter } from './infrastructure/security/item-guard.adapter.js';
import { KafkaItemCharacterEventConsumer } from './interfaces/messaging/kafka.character-event-consumer.js';
import { KafkaItemEventConsumer } from './interfaces/messaging/kafka.realm-event-consumer.js';
import { ApiItemClientAdapter } from './infrastructure/api-clients/api.item-client.adapter.js';
import { FactionsModule } from '../factions/factions.module.js';
import { CharactersModule } from '../characters/characters.module.js';
import { DeleteItemHandler } from './application/cqrs/handlers/delete-item.handler.js';
import { AddItemModifierHandler } from './application/cqrs/handlers/add-item-modifier.handler.js';
import { DeleteItemModifierHandler } from './application/cqrs/handlers/delete-item-modifier.handler.js';
import { ItemModifierStore } from './application/services/item-modifier.store.js';

import { ITEM_CLIENT } from './application/ports/item-client.port.js';
import { ITEM_GUARD } from './application/ports/item-guard.port.js';
import { ITEM_REPOSITORY } from './application/ports/item-repository.port.js';
@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([{ name: ItemModel.name, schema: ItemSchema }]),
    SharedModule,
    FactionsModule,
    GamesModule,
    forwardRef(() => CharactersModule),
  ],
  controllers: [ItemController, KafkaItemEventConsumer, KafkaItemCharacterEventConsumer],
  providers: [
    GetItemHandler,
    ItemAccess,
    GetItemsHandler,
    CreateItemHandler,
    UpdateItemHandler,
    DeleteItemHandler,
    AddItemModifierHandler,
    DeleteItemModifierHandler,
    ItemModifierStore,
    {
      provide: ITEM_REPOSITORY,
      useClass: MongoItemRepository,
    },
    {
      provide: ITEM_GUARD,
      useClass: ItemGuardAdapter,
    },
    {
      provide: ITEM_CLIENT,
      useClass: ApiItemClientAdapter,
    },
  ],
  exports: [ITEM_REPOSITORY, ITEM_CLIENT],
})
export class ItemsModule {}
