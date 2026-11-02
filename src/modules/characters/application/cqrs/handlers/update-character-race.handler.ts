import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { UpdateCharacterRaceCommand } from '../commands/update-character-race.command.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { type ProfessionClientPort, PROFESSION_CLIENT } from '../../ports/profession-client.port.js';
import { AddSkillCommand } from '../commands/add-skill.command.js';
import { CharacterUpdatedEvent } from '../../../domain/events/character.events.js';
import { type RaceClientPort, type RaceTrait, RACE_CLIENT } from '../../ports/race-client.port.js';
import { type TraitClientPort, TRAIT_CLIENT } from '../../ports/trait-client.port.js';
import { mapRaceTraits } from '../../services/race-traits.mapper.js';
import { Character } from '../../../domain/aggregates/character.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateCharacterRaceCommand)
export class UpdateCharacterRaceHandler implements ICommandHandler<UpdateCharacterRaceCommand, void> {
  private readonly logger = new Logger(UpdateCharacterRaceHandler.name);

  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(PROFESSION_CLIENT) private readonly professionClient: ProfessionClientPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    @Inject(RACE_CLIENT) private readonly raceClient: RaceClientPort,
    @Inject(TRAIT_CLIENT) private readonly traitClient: TraitClientPort,
    private commandBus: CommandBus,
  ) {}

  async execute(command: UpdateCharacterRaceCommand): Promise<void> {
    this.logger.log(`Executing UpdateCharacterRaceCommand for characterId: ${command.characterId}`);
    const characterId = command.characterId;

    let character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    for (const skillBonus of command.skillBonuses || []) {
      const skill = character!.findSkill(skillBonus.skillId, skillBonus.specialization);
      if (!skill) {
        this.logger.log(`Adding new skill ${skillBonus.skillId}:${skillBonus.specialization}`);
        const command = new AddSkillCommand(characterId, skillBonus.skillId, skillBonus.specialization, 0, 'system', ['rmu-admin']);
        character = await this.commandBus.execute(command);
      }
    }

    if (!character) {
      this.logger.error(`Character with id ${characterId} not found after attempting to add missing skills.`);
      throw new NotFoundError('Character', characterId);
    }

    const raceTraits = await this.getRaceTraits(command, character);
    if (raceTraits) {
      character.syncRaceTraits(await mapRaceTraits(raceTraits, this.traitClient));
    }
    character.updateRace({
      raceName: command.name,
      sizeId: command.sizeId,
      stats: command.stats,
      resistances: command.resistances,
      strideBonus: command.strideBonus,
      enduranceBonus: command.enduranceBonus,
      recoveryMultiplier: command.recoveryMultiplier,
      baseHits: command.baseHits,
      baseAt: command.baseAt,
      skillBonuses: command.skillBonuses || [],
    });
    const items = await this.itemRepository.findByCharacterId(characterId);
    this.characterProcessorService.process(character, items);
    await this.characterRepository.update(character);
    this.logger.log(`Character ${characterId} updated with new race values`);
    await this.events.publish('character', new CharacterUpdatedEvent(character.getProps()));
  }

  // Older race events do not carry the traits, so the race is read from core
  private async getRaceTraits(command: UpdateCharacterRaceCommand, character: Character): Promise<RaceTrait[] | undefined> {
    if (command.traits) {
      return command.traits;
    }
    try {
      const race = await this.raceClient.getRaceById(character.info.race.id);
      return race.traits || [];
    } catch (e) {
      this.logger.error(`Unable to read race ${character.info.race.id} traits: ${(e as Error).message}`);
      return undefined;
    }
  }
}
