import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { CharactersModule } from '../characters/characters.module.js';
import { CharacterModel, CharacterSchema } from '../characters/infrastructure/persistence/models/character.model.js';
import { FactionsModule } from '../factions/factions.module.js';
import { FactionModel, FactionSchema } from '../factions/infrastructure/persistence/models/faction.model.js';
import { GamesModule } from '../games/games.module.js';
import { ItemsModule } from '../items/items.module.js';
import { ItemModel, ItemSchema } from '../items/infrastructure/persistence/models/item.model.js';
import { SharedModule } from '../shared/shared.module.js';
import { ImportCharacterHandler } from './application/cqrs/handlers/import-character.handler.js';
import { ImportFactionHandler } from './application/cqrs/handlers/import-faction.handler.js';
import { ExportCharacterHandler } from './application/cqrs/handlers/export-character.handler.js';
import { ExportFactionHandler } from './application/cqrs/handlers/export-faction.handler.js';
import { IMPORT_CLEANUP } from './application/ports/import-cleanup.port.js';
import { ExportBuilder } from './application/services/export-builder.service.js';
import { ImportReferenceResolver } from './application/services/import-reference.resolver.js';
import { ImportService } from './application/services/import.service.js';
import { MongoImportCleanupAdapter } from './infrastructure/db/mongo.import-cleanup.adapter.js';
import { ExportController } from './interfaces/http/export.controller.js';

/** Export and import of characters and factions (workspace spec 024). */
@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([
      { name: CharacterModel.name, schema: CharacterSchema },
      { name: ItemModel.name, schema: ItemSchema },
      { name: FactionModel.name, schema: FactionSchema },
    ]),
    SharedModule,
    GamesModule,
    FactionsModule,
    CharactersModule,
    ItemsModule,
  ],
  controllers: [ExportController],
  providers: [
    ExportBuilder,
    ImportReferenceResolver,
    ImportService,
    ExportCharacterHandler,
    ExportFactionHandler,
    ImportCharacterHandler,
    ImportFactionHandler,
    { provide: IMPORT_CLEANUP, useClass: MongoImportCleanupAdapter },
  ],
})
export class ExportsModule {}
