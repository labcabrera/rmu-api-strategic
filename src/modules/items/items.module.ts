import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { ItemModel, ItemSchema } from './infrastructure/persistence/models/item.model';
import { ItemController } from './interfaces/http/item.controller';
import { GetItemHandler } from './application/cqrs/handlers/get-item.handler';
import { GetItemsHandler } from './application/cqrs/handlers/get-items.handler';
import { CreateItemHandler } from './application/cqrs/handlers/create-item.handler';
import { UpdateItemHandler } from './application/cqrs/handlers/update-item.handler';
import { MongoItemRepository } from './infrastructure/db/mongo.item.repository';
import { ItemGuardAdapter } from './infrastructure/security/item-guard.adapter';
import { KafkaItemCharacterEventConsumer } from './interfaces/messaging/kafka.character-event-consumer';
import { KafkaItemEventConsumer } from './interfaces/messaging/kafka.realm-event-consumer';
import { ApiItemClientAdapter } from './infrastructure/api-clients/api.item-client.adapter';
import { FactionsModule } from '../factions/factions.module';
import { CharactersModule } from '../characters/characters.module';
import { DeleteItemHandler } from './application/cqrs/handlers/delete-item.handler';
import { AddItemModifierHandler } from './application/cqrs/handlers/add-item-modifier.handler';
import { DeleteItemModifierHandler } from './application/cqrs/handlers/delete-item-modifier.handler';
import { ItemModifierStore } from './application/services/item-modifier.store';

import { ITEM_CLIENT } from './application/ports/item-client.port';
import { ITEM_GUARD } from './application/ports/item-guard.port';
import { ITEM_REPOSITORY } from './application/ports/item-repository.port';
@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([{ name: ItemModel.name, schema: ItemSchema }]),
    SharedModule,
    FactionsModule,
    forwardRef(() => CharactersModule),
  ],
  controllers: [ItemController, KafkaItemEventConsumer, KafkaItemCharacterEventConsumer],
  providers: [
    GetItemHandler,
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
