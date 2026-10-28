import { CharacterAccess } from '../../services/character-access.service.js';
import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { AddSkillCommand } from '../commands/add-skill.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { type SkillCategoryClientPort, SKILL_CATEGORY_CLIENT } from '../../ports/skill-category-client.port.js';
import { type SkillClientPort, type SkillResponse, SKILL_CLIENT } from '../../ports/skill-client.port.js';
import { type ProfessionClientPort, PROFESSION_CLIENT } from '../../ports/profession-client.port.js';
import { type RaceClientPort, RACE_CLIENT } from '../../ports/race-client.port.js';
import { characterRealms } from '../../../domain/value-objects/character-realm.vo.js';
import { developmentCostKey, skillStatistics } from '../../../domain/services/skills/skill-development.js';
import { isSpellListSkill } from '../../../domain/services/spells/spell-list-rules.js';
import { SpellListSkillResolver } from '../../services/spell-list-skill.resolver.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(AddSkillCommand)
export class AddSkillHandler implements ICommandHandler<AddSkillCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(SKILL_CLIENT) private readonly skillClient: SkillClientPort,
    @Inject(PROFESSION_CLIENT) private readonly professionClient: ProfessionClientPort,
    @Inject(SKILL_CATEGORY_CLIENT) private readonly skillCategoryClient: SkillCategoryClientPort,
    @Inject(RACE_CLIENT) private readonly raceClient: RaceClientPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly characterAccess: CharacterAccess,
    private readonly spellListSkillResolver: SpellListSkillResolver,
  ) {}

  async execute(command: AddSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const specialization = command.specialization;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);
    // Its owner, the owner of its game or an admin (F-strategic-15).
    await this.characterAccess.checkChange(character, command.userId, command.roles);

    // Initial ranks are a correction of the sheet: only an admin (F-strategic-25, spec 044 decision 2)
    if (command.ranks > 0 && !GameAccess.isAdmin(command.roles)) {
      throw new ValidationError(`Only admin users can add skills with ranks greater than 0`);
    }

    // A spell list: the skill follows from the list and the profession (spec 029)
    const skillId = await this.spellListSkillResolver.resolve(command.skillId, specialization, {
      professionId: character.info.professionId,
      realms: characterRealms(character.info),
    });
    if (this.alreadyHasSkill(character, skillId, specialization)) {
      throw new ValidationError(`Skill ${skillId} with specialization ${specialization} already exists for character ${characterId}`);
    }

    const [readedSkill, readedProfession, readedRace] = await Promise.all([
      this.skillClient.getSkillById(skillId),
      this.professionClient.getProfessionById(character.info.professionId),
      this.raceClient.getRaceById(character.info.race.id),
    ]);

    if (!readedSkill) throw new NotFoundError('Skill', skillId);
    if (!readedProfession) throw new NotFoundError('Profession', character.info.professionId);
    if (!readedRace) throw new NotFoundError('Race', character.info.race.id);

    validateSkillSpecialization(readedSkill, specialization);

    const readedCategory = await this.skillCategoryClient.getSkillCategoryById(readedSkill.categoryId);
    if (!readedCategory) throw new ValidationError(`Invalid skill category identifier '${readedSkill.categoryId}'`);

    const costKey = developmentCostKey(skillId, readedSkill.categoryId, character.experience.weaponDevelopment);
    const devPoints = readedProfession.skillCosts[costKey] || [];
    const statistics = skillStatistics(readedSkill.bonus, readedCategory);

    //TODO add to core model
    let racialBonus = 0;
    if (readedRace.skillBonuses) {
      const skillBonus = readedRace.skillBonuses.find(
        bonus => bonus.skillId === skillId && (bonus.specialization === specialization || (!bonus.specialization && !specialization)),
      );
      if (skillBonus) {
        racialBonus = skillBonus.bonus;
      }
    }
    character.addSkill(skillId, specialization, statistics, devPoints, racialBonus, readedSkill.categoryId, command.ranks);

    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    const updated = await this.characterRepository.update(character);
    await this.events.publishChanges('character', character);
    return updated;
  }

  // A list is learned once, whatever list skill it was taken with
  private alreadyHasSkill(character: Character, skillId: string, specialization: string | null): boolean {
    if (character.findSkill(skillId, specialization)) return true;
    return isSpellListSkill(skillId) && character.skills.some(s => isSpellListSkill(s.skillId) && s.specialization === specialization);
  }
}

/** A skill with a specialization category needs one unless it is optional; a skill without one allows none. */
export function validateSkillSpecialization(skill: SkillResponse, specialization: string | null): void {
  if (skill.specialization) {
    if (!specialization && !skill.specializationOptional) {
      throw new ValidationError(`Skill ${skill.id} requires a specialization`);
    }
  } else if (specialization) {
    throw new ValidationError(`Skill ${skill.id} does not allow specialization`);
  }
}
