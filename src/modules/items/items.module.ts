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

import { ItemLedgerEntryModel, ItemLedgerEntrySchema } from './infrastructure/persistence/models/item-ledger-entry.model.js';
import { MongoItemLedgerRepository } from './infrastructure/db/mongo.item-ledger.repository.js';
import { ITEM_LEDGER_REPOSITORY } from './application/ports/item-ledger-repository.port.js';
import { ItemLedgerController } from './interfaces/http/item-ledger.controller.js';
import { HolderAccess } from './application/services/holder-access.service.js';
import { EconomyRulesProvider } from './application/services/economy-rules.provider.js';
import { ItemLedger } from './application/services/item-ledger.service.js';
import { ItemFactory } from './application/services/item-factory.service.js';
import { InventorySync } from './application/services/inventory-sync.service.js';
import { Wallet } from './application/services/wallet.service.js';
import { TradingService } from './application/services/trading.service.js';
import { ItemStock } from './application/services/item-stock.service.js';
import { ItemManeuverService } from './application/services/item-maneuver.service.js';
import { PurchaseItemHandler } from './application/cqrs/handlers/purchase-item.handler.js';
import { SellItemHandler } from './application/cqrs/handlers/sell-item.handler.js';
import { TransferItemHandler } from './application/cqrs/handlers/transfer-item.handler.js';
import { DiscardItemHandler } from './application/cqrs/handlers/discard-item.handler.js';
import { CraftItemHandler } from './application/cqrs/handlers/craft-item.handler.js';
import { RepairItemHandler } from './application/cqrs/handlers/repair-item.handler.js';
import { TransferFactionGoldHandler } from './application/cqrs/handlers/transfer-faction-gold.handler.js';
import { GetItemLedgerHandler } from './application/cqrs/handlers/get-item-ledger.handler.js';
import { QuotePriceHandler } from './application/cqrs/handlers/quote-price.handler.js';
import { ITEM_CLIENT } from './application/ports/item-client.port.js';
import { ITEM_GUARD } from './application/ports/item-guard.port.js';
import { ITEM_REPOSITORY } from './application/ports/item-repository.port.js';
@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    MongooseModule.forFeature([
      { name: ItemModel.name, schema: ItemSchema },
      { name: ItemLedgerEntryModel.name, schema: ItemLedgerEntrySchema },
    ]),
    SharedModule,
    FactionsModule,
    GamesModule,
    forwardRef(() => CharactersModule),
  ],
  controllers: [ItemController, ItemLedgerController, KafkaItemEventConsumer, KafkaItemCharacterEventConsumer],
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
    HolderAccess,
    EconomyRulesProvider,
    ItemLedger,
    ItemFactory,
    InventorySync,
    Wallet,
    TradingService,
    ItemStock,
    ItemManeuverService,
    PurchaseItemHandler,
    SellItemHandler,
    TransferItemHandler,
    DiscardItemHandler,
    CraftItemHandler,
    RepairItemHandler,
    TransferFactionGoldHandler,
    GetItemLedgerHandler,
    QuotePriceHandler,
    {
      provide: ITEM_LEDGER_REPOSITORY,
      useClass: MongoItemLedgerRepository,
    },
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
  exports: [ITEM_REPOSITORY, ITEM_CLIENT, ITEM_LEDGER_REPOSITORY, ItemLedger],
})
export class ItemsModule {}
