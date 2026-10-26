import { CharacterWriter } from './application/services/character-writer.service.js';
import { CharacterAccess } from './application/services/character-access.service.js';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { GamesModule } from '../games/games.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { GetCharacterHandler } from './application/cqrs/handlers/get-character.handler.js';
import { GetCharactersHandler } from './application/cqrs/handlers/get-characters.handler.js';
import { CharacterProcessorService } from './domain/services/character-processor.service.js';
import { AttackProcessor } from './domain/services/character/processors/attack-processor.js';
import { DefenseProcessor } from './domain/services/character/processors/defense-processor.js';
import { EquipmentProcessor } from './domain/services/character/processors/equipment-processor.js';
import { HPProcessor } from './domain/services/character/processors/hp-processor.js';
import { InitiativeProcessor } from './domain/services/character/processors/initiative-processor.js';
import { MovementProcessor } from './domain/services/character/processors/movement-processor.js';
import { PowerProcessor } from './domain/services/character/processors/power-processor.js';
import { SkillProcessor } from './domain/services/character/processors/skill-processor.js';
import { StatProcessor } from './domain/services/character/processors/stat-processor.js';
import { UpdateSkillHandler } from './application/cqrs/handlers/update-skill.handler.js';
import { UpdateItemCarriedStatusHandler } from './application/cqrs/handlers/update-item-carried-status.handler.js';
import { SetupProfessionSkillHandler } from './application/cqrs/handlers/setup-professional-skill.handler.js';
import { AddXPHandler } from './application/cqrs/handlers/add-xp.handler.js';
import { AddSkillHandler } from './application/cqrs/handlers/add-skill.handler.js';
import { CreateCharacterHandler } from './application/cqrs/handlers/create-character.handler.js';
import { DeleteCharacterHandler } from './application/cqrs/handlers/delete-character.handler.js';
import { UpdateCharacterHandler } from './application/cqrs/handlers/update-character.handler.js';
import { DeleteSkillHandler } from './application/cqrs/handlers/delete-skill.handler.js';
import { EquipItemHandler } from './application/cqrs/handlers/equip-item.handler.js';
import { FactionsModule } from '../factions/factions.module.js';
import { LevelUpHandler } from './application/cqrs/handlers/level-up.handler.js';
import { ResistancesProcessor } from './domain/services/character/processors/resistances-processor.js';
import { XPProcessor } from './domain/services/character/processors/xp-processor.js';
import { MongoCharacterRepository } from './infrastructure/db/mongo.character.repository.js';
import { CharacterModel, CharacterSchema } from './infrastructure/persistence/models/character.model.js';
import { LevelDownSkillHandler } from './application/cqrs/handlers/level-down-skill.handler.js';
import { LevelUpSkillHandler } from './application/cqrs/handlers/level-up-skill.handler.js';
import { UnequipItemHandler } from './application/cqrs/handlers/unequip-item.handler.js';
import { UpdateCharacterRaceHandler } from './application/cqrs/handlers/update-character-race.handler.js';
import { AddTraitHandler } from './application/cqrs/handlers/add-trait.handler.js';
import { DeleteTraitHandler } from './application/cqrs/handlers/delete-trait.handler.js';
import { CharacterController } from './interfaces/http/character.controller.js';
import { CharacterSkillController } from './interfaces/http/character-skill.controller.js';
import { CharacterItemController } from './interfaces/http/character-item.controller.js';
import { CharacterTraitController } from './interfaces/http/character-trait.controller.js';
import { KafkaRaceEventConsumer } from './interfaces/messaging/kafka.race-event-consumer.js';
import { KafkaCharacterEventConsumer } from './interfaces/messaging/kafka.character-event-consumer.js';
import { ApiProfessionClientAdapter } from './infrastructure/api-clients/api.profession-client.adapter.js';
import { ApiTraitClientAdapter } from './infrastructure/api-clients/api.trait-client.adapter.js';
import { ApiRaceClientAdapter } from './infrastructure/api-clients/api.race-client.adapter.js';
import { ApiSkillCategoryClientAdapter } from './infrastructure/api-clients/api.skill-category-client.adapter.js';
import { ApiSkillClientAdapter } from './infrastructure/api-clients/api.skill-client.adapter.js';
import { ApiCultureClientAdapter } from './infrastructure/api-clients/api.culture-client.adapter.js';
import { ItemsModule } from '../items/items.module.js';
import { UpdateTemporaryStatHandler } from './application/cqrs/handlers/update-temporary-stat.handler.js';
import { CharacterHealthController } from './interfaces/http/character-health.controller.js';
import { CharacterMagicController } from './interfaces/http/character-magic.controller.js';
import { ChangePowerHandler } from './application/cqrs/handlers/change-power.handler.js';
import { GetCharacterSpellsHandler } from './application/cqrs/handlers/get-character-spells.handler.js';
import { SpellListSkillResolver } from './application/services/spell-list-skill.resolver.js';
import { SPELL_LIST_CLIENT } from './application/ports/spell-list-client.port.js';
import { ApiSpellListClientAdapter } from './infrastructure/api-clients/api.spell-list-client.adapter.js';
import { CharacterHealthStore } from './application/services/character-health.store.js';
import { ApplyTacticalOutcomeHandler } from './application/cqrs/handlers/apply-tactical-outcome.handler.js';
import { TacticalOutcomeItemsMerger } from './application/services/tactical-outcome-items.merger.js';
import { AddInjuryHandler } from './application/cqrs/handlers/add-injury.handler.js';
import { UpdateInjuryHandler } from './application/cqrs/handlers/update-injury.handler.js';
import { TreatInjuryHandler } from './application/cqrs/handlers/treat-injury.handler.js';
import { RollInjuryRecoveryHandler } from './application/cqrs/handlers/roll-injury-recovery.handler.js';
import { RollPermanentInjuryHandler } from './application/cqrs/handlers/roll-permanent-injury.handler.js';
import { RestCharacterHandler } from './application/cqrs/handlers/rest-character.handler.js';
import { ResolveConditionHandler } from './application/cqrs/handlers/resolve-condition.handler.js';
import { GetHealingLogHandler } from './application/cqrs/handlers/get-healing-log.handler.js';
import { GetTreatmentDifficultyHandler } from './application/cqrs/handlers/get-treatment-difficulty.handler.js';
import { ApiHealingTablesClientAdapter } from './infrastructure/api-clients/api.healing-tables-client.adapter.js';
import { ApiManeuverClientAdapter } from './infrastructure/api-clients/api.maneuver-client.adapter.js';
import { MongoHealingLogRepository } from './infrastructure/db/mongo.healing-log.repository.js';
import { CharacterHealingLogModel, CharacterHealingLogSchema } from './infrastructure/persistence/models/character-healing-log.model.js';

import { CHARACTER_REPOSITORY } from './application/ports/character-repository.port.js';
import { CULTURE_CLIENT } from './application/ports/culture-client.port.js';
import { HEALING_LOG_REPOSITORY } from './application/ports/healing-log-repository.port.js';
import { HEALING_TABLES_CLIENT } from './application/ports/healing-tables-client.port.js';
import { MANEUVER_CLIENT } from './application/ports/maneuver-client.port.js';
import { PROFESSION_CLIENT } from './application/ports/profession-client.port.js';
import { RACE_CLIENT } from './application/ports/race-client.port.js';
import { SKILL_CATEGORY_CLIENT } from './application/ports/skill-category-client.port.js';
import { SKILL_CLIENT } from './application/ports/skill-client.port.js';
import { TRAIT_CLIENT } from './application/ports/trait-client.port.js';
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
    CharacterMagicController,
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
    AddTraitHandler,
    DeleteTraitHandler,
    UpdateCharacterRaceHandler,
    UpdateTemporaryStatHandler,
    CharacterHealthStore,
    CharacterAccess,
    CharacterWriter,
    ApplyTacticalOutcomeHandler,
    TacticalOutcomeItemsMerger,
    AddInjuryHandler,
    UpdateInjuryHandler,
    TreatInjuryHandler,
    RollInjuryRecoveryHandler,
    RollPermanentInjuryHandler,
    RestCharacterHandler,
    ChangePowerHandler,
    GetCharacterSpellsHandler,
    SpellListSkillResolver,
    ResolveConditionHandler,
    GetHealingLogHandler,
    GetTreatmentDifficultyHandler,
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
    {
      provide: SPELL_LIST_CLIENT,
      useClass: ApiSpellListClientAdapter,
    },
  ],
  exports: [
    CHARACTER_REPOSITORY,
    CharacterProcessorService,
    CharacterAccess,
    MANEUVER_CLIENT,
    // The catalogs of core, for the import of export files (spec 024)
    RACE_CLIENT,
    PROFESSION_CLIENT,
    CULTURE_CLIENT,
    SKILL_CLIENT,
    TRAIT_CLIENT,
  ],
})
export class CharactersModule {}
