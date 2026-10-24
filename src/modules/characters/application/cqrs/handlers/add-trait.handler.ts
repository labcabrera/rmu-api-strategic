import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character, type TraitSpending } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { AddTraitCommand } from '../commands/add-trait.command.js';
import { type TraitClientPort, type TraitResponse, TRAIT_CLIENT } from '../../ports/trait-client.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { type GameRules, loadGameRules } from '../../services/game-rules.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(AddTraitCommand)
export class AddTraitHandler implements ICommandHandler<AddTraitCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(TRAIT_CLIENT) private readonly traitClient: TraitClientPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: AddTraitCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const trait = await this.traitClient.getTraitById(command.traitId);
    if (!trait) throw new NotFoundError('Trait', command.traitId);

    this.validateCommand(command, trait);
    const isTalent = trait.isTalent;
    const cost = this.calculateCost(trait, command.tier);
    const rules = await loadGameRules(this.gameRepository, character.gameId);
    this.validateMaxCost(rules, command.traitId, cost);
    // Adding a tier based trait the character already has with a higher tier improves it, paying the difference
    const current = character.findCharacterTrait(command.traitId, command.specialization);
    const isImprovement = !!current && trait.isTierBased && !!current.tier && !!command.tier && command.tier > current.tier;
    const spending = this.getSpending(character, rules, isImprovement ? cost - current.cost : cost, isImprovement);
    if (isImprovement) {
      character.improveTrait(command.traitId, command.specialization, command.tier, cost, spending);
    } else {
      character.addTrait(command.traitId, trait.name, isTalent, command.tier, cost, command.specialization, spending);
    }
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    const updated = await this.characterRepository.update(character);
    await this.events.publishChanges('character', character);
    return updated;
  }

  private validateCommand(command: AddTraitCommand, trait: TraitResponse): void {
    if (command.tier && command.tier < 1) {
      throw new ValidationError(`Trait ${command.traitId} tier must be greater than 0`, 'err-trait-tier-invalid');
    }
    if (trait.isTierBased && !command.tier) {
      throw new ValidationError(`Trait ${command.traitId} is tier based, tier must be defined`, 'err-trait-tier-required');
    }
    if (!trait.isTierBased && command.tier) {
      throw new ValidationError(`Trait ${command.traitId} is not tier based, tier must be undefined`, 'err-trait-tier-invalid');
    }
    if (command.tier && trait.maxTier && command.tier > trait.maxTier) {
      throw new ValidationError(
        `Trait ${command.traitId} max tier is ${trait.maxTier}, tier must be less or equal than max tier`,
        'err-trait-tier-invalid',
      );
    }
    if (trait.specialization && !command.specialization) {
      throw new ValidationError(`Trait ${command.traitId} requires a specialization value`, 'err-trait-specialization-required');
    }
    if (!trait.specialization && command.specialization) {
      throw new ValidationError(`Trait ${command.traitId} does not require a specialization value`, 'err-trait-specialization-not-allowed');
    }
  }

  /**
   * Pools that pay the trait, by game talent policy. Creation means level 0 or 1, before the first level up from level 1.
   * - 'free': normal points first, then bonus points. At creation the bonus points are not limited per level unless
   *   bonusDevPointsCapAtCreation is set.
   * - 'race-points-at-creation': at creation only bonus points; afterwards only improvements of the talents already owned.
   * - 'flaw-points-at-creation': at creation only the points returned by flaws, which flaws feed instead of the normal pool.
   */
  private getSpending(character: Character, rules: GameRules, cost: number, isImprovement: boolean): TraitSpending {
    const creation = character.isInCreation();
    const { talentPolicy, bonusDevPointsCapAtCreation } = rules.options;
    const spend = {
      bonusDevPointsPerLevel: rules.powerLevel.raceDevPointsPerLevel,
      capBonus: !creation || bonusDevPointsCapAtCreation,
    };
    const flawPool = talentPolicy === 'flaw-points-at-creation' && creation ? 'flaw' : 'normal';
    if (talentPolicy === 'race-points-at-creation') {
      if (creation) {
        return {
          spend: { ...spend, pools: ['bonus'] },
          flawPool,
          onInsufficient: () =>
            new ValidationError(
              'At creation talents can only be paid with bonus development points',
              'err-talent-policy-bonus-points-only',
            ),
        };
      }
      if (cost > 0 && !isImprovement) {
        throw new ValidationError(
          'New talents can only be acquired at creation, later only the talents already owned can be improved',
          'err-talent-policy-creation-only',
        );
      }
    }
    if (talentPolicy === 'flaw-points-at-creation' && creation) {
      return {
        spend: { ...spend, pools: ['flaw'] },
        flawPool,
        onInsufficient: () =>
          new ValidationError(
            'At creation talents can only be paid with the points returned by flaws',
            'err-talent-policy-flaw-points-only',
          ),
      };
    }
    return { spend, flawPool };
  }

  // Flaws have a negative cost and no limit
  private validateMaxCost(rules: GameRules, traitId: string, cost: number): void {
    const maxTraitCost = rules.powerLevel.maxTraitCost;
    if (cost > maxTraitCost) {
      throw new ValidationError(
        `Trait ${traitId} costs ${cost} development points, the game allows up to ${maxTraitCost}`,
        'err-trait-max-cost',
      );
    }
  }

  private calculateCost(trait: TraitResponse, tier: number | undefined): number {
    let cost = trait.adquisitionCost || 0;
    if (trait.isTierBased && tier && tier > 1) {
      cost += (tier - 1) * (trait.tierCost || 0);
    }
    return cost;
  }
}
