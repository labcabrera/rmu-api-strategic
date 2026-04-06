import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { ItemModel, ItemSchema } from './infrastructure/persistence/models/item.model';
import { ItemController } from './interfaces/http/item.controller';
import { GetItemHandler } from './application/cqrs/handlers/get-item.handler';
import { GetItemsHandler } from './application/cqrs/handlers/get-items.handler';
import { CreateItemHandler } from './application/cqrs/handlers/create-item.handler';
import { UpdateItemHandler } from './application/cqrs/handlers/update-item.handler';
import { MongoItemRepository } from './infrastructure/db/mongo-item.repository';
import { ItemGuardAdapter } from './infrastructure/security/game-guard.adapter';
import { KafkaItemEventConsumer } from './interfaces/messaging/kafka.realm-event-consumer';
import { KafkaItemEventBusAdapter } from './infrastructure/messaging/kafka.item-event-bus.adapter';
import { ApiItemClientAdapter } from './infrastructure/api-clients/api.item-client.adapter';
import { FactionsModule } from '../factions/factions.module';
import { CharactersModule } from '../characters/characters.module';
import { DeleteItemHandler } from './application/cqrs/handlers/delete-item.handler';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([{ name: ItemModel.name, schema: ItemSchema }]),
    AuthModule,
    SharedModule,
    FactionsModule,
    forwardRef(() => CharactersModule),
  ],
  controllers: [ItemController, KafkaItemEventConsumer],
  providers: [
    GetItemHandler,
    GetItemsHandler,
    CreateItemHandler,
    UpdateItemHandler,
    DeleteItemHandler,
    {
      provide: 'ItemRepository',
      useClass: MongoItemRepository,
    },
    {
      provide: 'ItemEventProducer',
      useClass: KafkaItemEventBusAdapter,
    },
    {
      provide: 'ItemGuardPort',
      useClass: ItemGuardAdapter,
    },
    {
      provide: 'ItemClientPort',
      useClass: ApiItemClientAdapter,
    },
  ],
  exports: ['ItemRepository', 'ItemClientPort'],
})
export class ItemsModule {}
