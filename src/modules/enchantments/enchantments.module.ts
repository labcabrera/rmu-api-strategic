import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { CharactersModule } from '../characters/characters.module.js';
import { GamesModule } from '../games/games.module.js';
import { ItemsModule } from '../items/items.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { CancelEnchantmentHandler } from './application/cqrs/handlers/cancel-enchantment.handler.js';
import { CompleteEnchantmentHandler } from './application/cqrs/handlers/complete-enchantment.handler.js';
import { CreateEnchantmentHandler } from './application/cqrs/handlers/create-enchantment.handler.js';
import {
  ChangeEnchantmentStatusHandler,
  DeleteEnchantmentHandler,
  ProgressEnchantmentHandler,
  SendEnchantmentFailureRollsHandler,
} from './application/cqrs/handlers/enchantment-work.handlers.js';
import { GetEnchantmentHandler, GetEnchantmentsHandler } from './application/cqrs/handlers/get-enchantments.handler.js';
import { QuoteEnchantmentHandler } from './application/cqrs/handlers/quote-enchantment.handler.js';
import { UpdateEnchantmentHandler } from './application/cqrs/handlers/update-enchantment.handler.js';
import { ALCHEMY_TABLES_CLIENT } from './application/ports/alchemy-tables-client.port.js';
import { ENCHANTMENT_REPOSITORY } from './application/ports/enchantment-repository.port.js';
import { EnchantmentAccess } from './application/services/enchantment-access.service.js';
import { EnchantmentLedger } from './application/services/enchantment-ledger.service.js';
import { EnchantmentPlanning } from './application/services/enchantment-planning.service.js';
import { ApiAlchemyTablesClientAdapter } from './infrastructure/api-clients/api.alchemy-tables-client.adapter.js';
import { MongoEnchantmentProjectRepository } from './infrastructure/db/mongo.enchantment-project.repository.js';
import { EnchantmentProjectModel, EnchantmentProjectSchema } from './infrastructure/persistence/models/enchantment-project.model.js';
import { EnchantmentController } from './interfaces/http/enchantment.controller.js';

/** Enchantment projects of the alchemists (workspace spec 064). */
@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: EnchantmentProjectModel.name, schema: EnchantmentProjectSchema }]),
    SharedModule,
    GamesModule,
    CharactersModule,
    ItemsModule,
  ],
  controllers: [EnchantmentController],
  providers: [
    QuoteEnchantmentHandler,
    CreateEnchantmentHandler,
    GetEnchantmentHandler,
    GetEnchantmentsHandler,
    SendEnchantmentFailureRollsHandler,
    ProgressEnchantmentHandler,
    ChangeEnchantmentStatusHandler,
    UpdateEnchantmentHandler,
    CompleteEnchantmentHandler,
    CancelEnchantmentHandler,
    DeleteEnchantmentHandler,
    EnchantmentPlanning,
    EnchantmentAccess,
    EnchantmentLedger,
    { provide: ENCHANTMENT_REPOSITORY, useClass: MongoEnchantmentProjectRepository },
    { provide: ALCHEMY_TABLES_CLIENT, useClass: ApiAlchemyTablesClientAdapter },
  ],
})
export class EnchantmentsModule {}
