import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import type { CharacterRepository } from '../../ports/character.repository';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';
import { UpdateCharacterRaceCommand } from '../commands/update-character-race.command';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';
import type { ProfessionClientPort } from '../../ports/profession-client.port';
import { AddSkillCommand } from '../commands/add-skill.command';
import { CharacterUpdatedEvent } from 'src/modules/characters/domain/events/character.events';
import type { RaceClientPort, RaceTrait } from '../../ports/race-client.port';
import type { TraitClientPort } from '../../ports/trait-client.port';
import { mapRaceTraits } from '../../services/race-traits.mapper';
import { Character } from 'src/modules/characters/domain/aggregates/character.aggregate';

@CommandHandler(UpdateCharacterRaceCommand)
export class UpdateCharacterRaceHandler implements ICommandHandler<UpdateCharacterRaceCommand, void> {
  private readonly logger = new Logger(UpdateCharacterRaceHandler.name);

  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('ProfessionClient') private readonly professionClient: ProfessionClientPort,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
    @Inject('RaceClient') private readonly raceClient: RaceClientPort,
    @Inject('TraitClient') private readonly traitClient: TraitClientPort,
    @Inject() private commandBus: CommandBus,
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
      baseHits: command.baseHits,
      baseAt: command.baseAt,
      skillBonuses: command.skillBonuses || [],
    });
    const items = await this.itemRepository.findByCharacterId(characterId);
    this.characterProcessorService.process(character, items);
    await this.characterRepository.update(character.id, character);
    this.logger.log(`Character ${characterId} updated with new race values`);
    this.characterEventBus.publish(new CharacterUpdatedEvent(character.getProps()));
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
