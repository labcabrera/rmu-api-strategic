import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
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
import { PowerProcessor } from './domain/services/character/processors/power-processor';
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
import { ApiCultureClientAdapter } from './infrastructure/api-clients/api.culture-client.adapter';
import { ItemsModule } from '../items/items.module';
import { UpdateTemporaryStatHandler } from './application/cqrs/handlers/update-temporary-stat.handler';
import { CharacterHealthController } from './interfaces/http/character-health.controller';
import { CharacterHealthStore } from './application/services/character-health.store';
import { ApplyTacticalOutcomeHandler } from './application/cqrs/handlers/apply-tactical-outcome.handler';
import { TacticalOutcomeItemsMerger } from './application/services/tactical-outcome-items.merger';
import { AddInjuryHandler } from './application/cqrs/handlers/add-injury.handler';
import { UpdateInjuryHandler } from './application/cqrs/handlers/update-injury.handler';
import { TreatInjuryHandler } from './application/cqrs/handlers/treat-injury.handler';
import { RollInjuryRecoveryHandler } from './application/cqrs/handlers/roll-injury-recovery.handler';
import { RollPermanentInjuryHandler } from './application/cqrs/handlers/roll-permanent-injury.handler';
import { RestCharacterHandler } from './application/cqrs/handlers/rest-character.handler';
import { ResolveConditionHandler } from './application/cqrs/handlers/resolve-condition.handler';
import { GetHealingLogHandler } from './application/cqrs/handlers/get-healing-log.handler';
import { ApiHealingTablesClientAdapter } from './infrastructure/api-clients/api.healing-tables-client.adapter';
import { ApiManeuverClientAdapter } from './infrastructure/api-clients/api.maneuver-client.adapter';
import { MongoHealingLogRepository } from './infrastructure/db/mongo.healing-log.repository';
import { CharacterHealingLogModel, CharacterHealingLogSchema } from './infrastructure/persistence/models/character-healing-log.model';

import { CHARACTER_REPOSITORY } from './application/ports/character-repository.port';
import { CULTURE_CLIENT } from './application/ports/culture-client.port';
import { HEALING_LOG_REPOSITORY } from './application/ports/healing-log-repository.port';
import { HEALING_TABLES_CLIENT } from './application/ports/healing-tables-client.port';
import { MANEUVER_CLIENT } from './application/ports/maneuver-client.port';
import { PROFESSION_CLIENT } from './application/ports/profession-client.port';
import { RACE_CLIENT } from './application/ports/race-client.port';
import { SKILL_CATEGORY_CLIENT } from './application/ports/skill-category-client.port';
import { SKILL_CLIENT } from './application/ports/skill-client.port';
import { TRAIT_CLIENT } from './application/ports/trait-client.port';
@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: CharacterModel.name, schema: CharacterSchema },
      { name: CharacterHealingLogModel.name, schema: CharacterHealingLogSchema },
    ]),
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
    CharacterHealthController,
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
    PowerProcessor,
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
    CharacterHealthStore,
    ApplyTacticalOutcomeHandler,
    TacticalOutcomeItemsMerger,
    AddInjuryHandler,
    UpdateInjuryHandler,
    TreatInjuryHandler,
    RollInjuryRecoveryHandler,
    RollPermanentInjuryHandler,
    RestCharacterHandler,
    ResolveConditionHandler,
    GetHealingLogHandler,
    {
      provide: HEALING_LOG_REPOSITORY,
      useClass: MongoHealingLogRepository,
    },
    {
      provide: HEALING_TABLES_CLIENT,
      useClass: ApiHealingTablesClientAdapter,
    },
    {
      provide: MANEUVER_CLIENT,
      useClass: ApiManeuverClientAdapter,
    },
    {
      provide: CHARACTER_REPOSITORY,
      useClass: MongoCharacterRepository,
    },
    {
      provide: RACE_CLIENT,
      useClass: ApiRaceClientAdapter,
    },
    {
      provide: SKILL_CLIENT,
      useClass: ApiSkillClientAdapter,
    },
    {
      provide: SKILL_CATEGORY_CLIENT,
      useClass: ApiSkillCategoryClientAdapter,
    },
    {
      provide: PROFESSION_CLIENT,
      useClass: ApiProfessionClientAdapter,
    },
    {
      provide: TRAIT_CLIENT,
      useClass: ApiTraitClientAdapter,
    },
    {
      provide: CULTURE_CLIENT,
      useClass: ApiCultureClientAdapter,
    },
  ],
  exports: [CHARACTER_REPOSITORY, CharacterProcessorService],
})
export class CharactersModule {}
