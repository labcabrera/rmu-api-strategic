import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/modules/auth/auth.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { GetCharacterHandler } from './application/cqrs/handlers/get-character.handler';
import { GetCharactersHandler } from './application/cqrs/handlers/get-characters.handler';
import { CharacterProcessorService } from './domain/services/character-processor.service';
import { AttackProcessor } from './domain/services/character/processors/attack-processor';
import { DefenseProcessor } from './domain/services/character/processors/defense-processor';
import { EquipmentProcessor } from './domain/services/character/processors/equipment-processor';
import { HPProcessor } from './domain/services/character/processors/hp-processor';
import { InitiativeProcessor } from './domain/services/character/processors/initiative-processor';
import { MovementProcessor } from './domain/services/character/processors/movement-processor';
import { SkillProcessor } from './domain/services/character/processors/skill-processor';
import { StatProcessor } from './domain/services/character/processors/stat-processor';
import { UpdateSkillHandler } from './application/cqrs/handlers/update-skill.handler';
import { UpdateItemCarriedStatusHandler } from './application/cqrs/handlers/update-item-carried-status.handler';
import { SetupProfessionSkillHandler } from './application/cqrs/handlers/setup-professional-skill.handler';
import { AddXPHandler } from './application/cqrs/handlers/add-xp.handler';
import { AddSkillHandler } from './application/cqrs/handlers/add-skill.handler';
import { CreateCharacterHandler } from './application/cqrs/handlers/create-character.handler';
import { DeleteCharacterHandler } from './application/cqrs/handlers/delete-character.handler';
import { UpdateCharacterHandler } from './application/cqrs/handlers/update-character.handler';
import { DeleteSkillHandler } from './application/cqrs/handlers/delete-skill.handler';
import { EquipItemHandler } from './application/cqrs/handlers/equip-item.handler';
import { FactionsModule } from '../factions/factions.module';
import { LevelUpHandler } from './application/cqrs/handlers/level-up.handler';
import { ResistancesProcessor } from './domain/services/character/processors/resistances-processor';
import { XPProcessor } from './domain/services/character/processors/xp-processor';
import { MongoCharacterRepository } from './infrastructure/db/mongo.character.repository';
import { CharacterModel, CharacterSchema } from './infrastructure/persistence/models/character.model';
import { LevelDownSkillHandler } from './application/cqrs/handlers/level-down-skill.handler';
import { LevelUpSkillHandler } from './application/cqrs/handlers/level-up-skill.handler';
import { TransferGoldHandler } from './application/cqrs/handlers/transfer-gold.handler';
import { UnequipItemHandler } from './application/cqrs/handlers/unequip-item.handler';
import { KafkaCharacterEventBusAdapter } from './infrastructure/messaging/kafka.game-event-bus.adapter';
import { UpdateCharacterRaceHandler } from './application/cqrs/handlers/update-character-race.handler';
import { AddTraitHandler } from './application/cqrs/handlers/add-trait.handler';
import { DeleteTraitHandler } from './application/cqrs/handlers/delete-trait.handler';
import { CharacterController } from './interfaces/http/character.controller';
import { CharacterSkillController } from './interfaces/http/character-skill.controller';
import { CharacterItemController } from './interfaces/http/character-item.controller';
import { CharacterTraitController } from './interfaces/http/character-trait.controller';
import { KafkaRaceEventConsumer } from './interfaces/messaging/kafka.race-event-consumer';
import { KafkaCharacterEventConsumer } from './interfaces/messaging/kafka.character-event-consumer';
import { ApiProfessionClientAdapter } from './infrastructure/api-clients/api.profession-client.adapter';
import { ApiTraitClientAdapter } from './infrastructure/api-clients/api.trait-client.adapter';
import { ApiRaceClientAdapter } from './infrastructure/api-clients/api.race-client.adapter';
import { ApiSkillCategoryClientAdapter } from './infrastructure/api-clients/api.skill-category-client.adapter';
import { ApiSkillClientAdapter } from './infrastructure/api-clients/api.skill-client.adapter';
import { ItemsModule } from '../items/items.module';
import { UpdateTemporaryStatHandler } from './application/cqrs/handlers/update-temporary-stat.handler';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([{ name: CharacterModel.name, schema: CharacterSchema }]),
    AuthModule,
    SharedModule,
    GamesModule,
    FactionsModule,
    forwardRef(() => ItemsModule),
  ],
  controllers: [
    CharacterController,
    CharacterSkillController,
    CharacterItemController,
    CharacterTraitController,
    KafkaRaceEventConsumer,
    KafkaCharacterEventConsumer,
  ],
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
    GetCharacterHandler,
    GetCharactersHandler,
    CreateCharacterHandler,
    UpdateCharacterHandler,
    DeleteCharacterHandler,
    AddSkillHandler,
    UpdateSkillHandler,
    DeleteSkillHandler,
    EquipItemHandler,
    UnequipItemHandler,
    UpdateItemCarriedStatusHandler,
    AddXPHandler,
    LevelUpHandler,
    LevelUpSkillHandler,
    LevelDownSkillHandler,
    SetupProfessionSkillHandler,
    TransferGoldHandler,
    AddTraitHandler,
    DeleteTraitHandler,
    UpdateCharacterRaceHandler,
    UpdateTemporaryStatHandler,
    {
      provide: 'CharacterRepository',
      useClass: MongoCharacterRepository,
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
      provide: 'TraitClient',
      useClass: ApiTraitClientAdapter,
    },
    {
      provide: 'CharacterEventBus',
      useClass: KafkaCharacterEventBusAdapter,
    },
  ],
  exports: ['CharacterRepository'],
})
export class CharactersModule {}
