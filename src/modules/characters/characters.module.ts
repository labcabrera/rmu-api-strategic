import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/modules/auth/auth.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { GetCharacterQueryHandler } from './application/cqrs/handlers/get-character.query.handler';
import { GetCharactersQueryHandler } from './application/cqrs/handlers/get-characters.query.handler';
import { CharacterProcessorService } from './domain/services/character-processor.service';
import { AttackProcessor } from './domain/services/character/processors/attack-processor';
import { DefenseProcessor } from './domain/services/character/processors/defense-processor';
import { EquipmentProcessor } from './domain/services/character/processors/equipment-processor';
import { HPProcessor } from './domain/services/character/processors/hp-processor';
import { InitiativeProcessor } from './domain/services/character/processors/initiative-processor';
import { MovementProcessor } from './domain/services/character/processors/movement-processor';
import { SkillProcessor } from './domain/services/character/processors/skill-processor';
import { StatProcessor } from './domain/services/character/processors/stat-processor';
import { ApiItemClientAdapter } from './infrastructure/api-clients/api.item-client.adapter';
import { ApiRaceClientAdapter } from './infrastructure/api-clients/api.race-client.adapter';
import { ApiSkillClientAdapter } from './infrastructure/api-clients/api.skill-client.adapter';
import { ApiSkillCategoryClientAdapter } from './infrastructure/api-clients/api.skill-category-client.adapter';
import { CharacterModel, CharacterSchema } from './infrastructure/persistence/models/character.model';
import { MongoCharacterRepository } from './infrastructure/db/mongo.character.repository';
import { FactionsModule } from '../factions/factions.module';
import { ApiProfessionClientAdapter } from './infrastructure/api-clients/api.profession-client.adapter';
import { XPProcessor } from './domain/services/character/processors/xp-processor';
import { MongoCharacterLevelDevRepository } from './infrastructure/db/mongo.character-level-dev.repository';
import {
  CharacterLevelDevModel,
  CharacterLevelDevSchema,
} from './infrastructure/persistence/models/character-level-dev.model';
import { ResistancesProcessor } from './domain/services/character/processors/resistances-processor';
import { AddItemCommandHandler } from './application/cqrs/handlers/add-item.command.handler';
import { AddSkillCommandHandler } from './application/cqrs/handlers/add-skill.command.handler';
import { AddXPCommandHandler } from './application/cqrs/handlers/add-xp.command.handler';
import { CreateCharacterCommandHandler } from './application/cqrs/handlers/create-character.command.handler';
import { DeleteCharacterCommandHandler } from './application/cqrs/handlers/delete-character.command.handler';
import { DeleteItemCommandHandler } from './application/cqrs/handlers/delete-item.command.handler';
import { DeleteSkillCommandHandler } from './application/cqrs/handlers/delete-skill.command.handler';
import { EquipItemCommandHandler } from './application/cqrs/handlers/equip-item.command.handler';
import { LevelDownSkillCommandHandler } from './application/cqrs/handlers/level-down-skill.command.handler';
import { LevelUpSkillCommandHandler } from './application/cqrs/handlers/level-up-skill.command.handler';
import { LevelUpCommandHandler } from './application/cqrs/handlers/level-up.command.handler';
import { SetupProfessionSkillCommandHandler } from './application/cqrs/handlers/setup-professional-skill.command.handler';
import { TransferGoldCommandHandler } from './application/cqrs/handlers/transfer-gold.command.handler';
import { UnequipItemCommandHandler } from './application/cqrs/handlers/unequip-item.command.handler';
import { UpdateCharacterCommandHandler } from './application/cqrs/handlers/update-character.command.handler';
import { UpdateItemCarriedStatusCommandHandler } from './application/cqrs/handlers/update-item-carried-status.command.handler';
import { UpdateSkillCommandHandler } from './application/cqrs/handlers/update-skill.command.handler';
import { CharacterController } from './interfaces/http/character.controller';
import { CharacterSkillController } from './interfaces/http/character-skill.controller';
import { CharacterItemController } from './interfaces/http/character-item.controller';

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
    ResistancesProcessor,
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
    UnequipItemCommandHandler,
    UpdateItemCarriedStatusCommandHandler,
    AddXPCommandHandler,
    LevelUpCommandHandler,
    LevelUpSkillCommandHandler,
    LevelDownSkillCommandHandler,
    SetupProfessionSkillCommandHandler,
    TransferGoldCommandHandler,
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
      useClass: ApiRaceClientAdapter,
    },
    {
      provide: 'SkillClient',
      useClass: ApiSkillClientAdapter,
    },
    {
      provide: 'SkillCategoryClient',
      useClass: ApiSkillCategoryClientAdapter,
    },
    {
      provide: 'ProfessionClient',
      useClass: ApiProfessionClientAdapter,
    },
    {
      provide: 'ItemClient',
      useClass: ApiItemClientAdapter,
    },
  ],
  exports: ['CharacterRepository'],
})
export class CharactersModule {}
