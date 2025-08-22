import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from 'src/modules/auth/auth.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { AddItemCommandHandler } from './application/commands/handlers/add-item.command.handler';
import { AddSkillCommandHandler } from './application/commands/handlers/add-skill.command.handler';
import { CreateCharacterCommandHandler } from './application/commands/handlers/create-character.command.handler';
import { DeleteCharacterCommandHandler } from './application/commands/handlers/delete-character.command.handler';
import { DeleteItemCommandHandler } from './application/commands/handlers/delete-item.command.handler';
import { DeleteSkillCommandHandler } from './application/commands/handlers/delete-skill.command.handler';
import { UpdateCharacterCommandHandler } from './application/commands/handlers/update-character.command.handler';
import { UpdateSkillCommandHandler } from './application/commands/handlers/update-skill.command.handler';
import { GetCharacterQueryHandler } from './application/queries/handlers/get-character.query.handler';
import { GetCharactersQueryHandler } from './application/queries/handlers/get-characters.query.handler';
import { CharacterProcessorService } from './domain/services/character-processor.service';
import { AttackProcessor } from './domain/services/character/processors/attack-processor';
import { DefenseProcessor } from './domain/services/character/processors/defense-processor';
import { EquipmentProcessor } from './domain/services/character/processors/equipment-processor';
import { HPProcessor } from './domain/services/character/processors/hp-processor';
import { InitiativeProcessor } from './domain/services/character/processors/initiative-processor';
import { MovementProcessor } from './domain/services/character/processors/movement-processor';
import { SkillProcessor } from './domain/services/character/processors/skill-processor';
import { StatProcessor } from './domain/services/character/processors/stat-processor';
import { ItemApiClient } from './infrastructure/clients/item-api-client';
import { RaceApiClient } from './infrastructure/clients/race-api-client';
import { SkillApiClient } from './infrastructure/clients/skill-api-client';
import { SkillCategoryApiClient } from './infrastructure/clients/skill-category-api-client';
import { CharacterController } from './infrastructure/controllers/characters.controller';
import { CharacterModel, CharacterSchema } from './infrastructure/persistence/models/character.model';
import { MongoCharacterRepository } from './infrastructure/persistence/repositories/mongo-character.repository';
import { FactionsModule } from '../factions/factions.module';
import { ProfessionApiClient } from './infrastructure/clients/profession-api-client';
import { XPProcessor } from './domain/services/character/processors/xp-processor';
import { AddXPCommandHandler } from './application/commands/handlers/add-xp.command.handler';
import { LevelUpCommandHandler } from './application/commands/handlers/level-up.command.handler';
import { MongoCharacterLevelDevRepository } from './infrastructure/persistence/repositories/mongo-character-level-dev.repository';
import { CharacterLevelDevModel, CharacterLevelDevSchema } from './infrastructure/persistence/models/character-level-dev.model';
import { LevelUpSkillCommandHandler } from './application/commands/handlers/level-up-skill.command.handler';
import { LevelDownSkillCommandHandler } from './application/commands/handlers/level-down-skill.command.handler';
import { CharacterSkillController } from './infrastructure/controllers/characters-skill.controller';
import { CharacterItemController } from './infrastructure/controllers/characters-item.controller';
import { EquipItemCommandHandler } from './application/commands/handlers/equip-item.command.handler';
import { SetupProfessionSkillCommandHandler } from './application/commands/handlers/setup-professional-skill.command.handler';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: CharacterModel.name, schema: CharacterSchema },
      { name: CharacterLevelDevModel.name, schema: CharacterLevelDevSchema },
    ]),
    AuthModule,
    SharedModule,
    GamesModule,
    FactionsModule,
  ],
  controllers: [CharacterController, CharacterSkillController, CharacterItemController],
  providers: [
    StatProcessor,
    MovementProcessor,
    InitiativeProcessor,
    SkillProcessor,
    AttackProcessor,
    HPProcessor,
    EquipmentProcessor,
    DefenseProcessor,
    XPProcessor,
    CharacterProcessorService,
    GetCharacterQueryHandler,
    GetCharactersQueryHandler,
    CreateCharacterCommandHandler,
    UpdateCharacterCommandHandler,
    DeleteCharacterCommandHandler,
    AddSkillCommandHandler,
    UpdateSkillCommandHandler,
    DeleteSkillCommandHandler,
    AddItemCommandHandler,
    DeleteItemCommandHandler,
    EquipItemCommandHandler,
    AddXPCommandHandler,
    LevelUpCommandHandler,
    LevelUpSkillCommandHandler,
    LevelDownSkillCommandHandler,
    SetupProfessionSkillCommandHandler,
    {
      provide: 'CharacterRepository',
      useClass: MongoCharacterRepository,
    },
    {
      provide: 'CharacterLevelDevRepository',
      useClass: MongoCharacterLevelDevRepository,
    },
    {
      provide: 'RaceClient',
      useClass: RaceApiClient,
    },
    {
      provide: 'SkillClient',
      useClass: SkillApiClient,
    },
    {
      provide: 'SkillCategoryClient',
      useClass: SkillCategoryApiClient,
    },
    {
      provide: 'ProfessionClient',
      useClass: ProfessionApiClient,
    },
    {
      provide: 'ItemClient',
      useClass: ItemApiClient,
    },
  ],
  exports: ['CharacterRepository'],
})
export class CharactersModule {}
