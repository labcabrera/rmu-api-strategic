import { CharacterAccess } from '../../services/character-access.service.js';
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
import {
  DEV_POINTS_INSUFFICIENT,
  type DevPointsPoolChoice,
  poolsFor,
} from '../../../domain/services/dev-points/dev-points-spending.service.js';
import { TalentSkillRanksService } from '../../services/talent-skill-ranks.service.js';
import { CharacterTrait, type CharacterTraitPurchase, type TraitRestriction } from '../../../domain/value-objects/character-trait.vo.js';
import { MASTER_PREREQUISITES, TalentPurchasePolicy } from '../../../domain/services/traits/talent-purchase-policy.js';

@CommandHandler(AddTraitCommand)
export class AddTraitHandler implements ICommandHandler<AddTraitCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(TRAIT_CLIENT) private readonly traitClient: TraitClientPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly characterAccess: CharacterAccess,
    private readonly talentSkillRanks: TalentSkillRanksService,
  ) {}

  async execute(command: AddTraitCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);
    // Its owner, the owner of its game or an admin (F-strategic-15).
    await this.characterAccess.checkChange(character, command.userId, command.roles);

    const trait = await this.traitClient.getTraitById(command.traitId);
    if (!trait) throw new NotFoundError('Trait', command.traitId);

    this.validateCommand(command, trait);
    const current = character.findCharacterTrait(command.traitId, command.specialization);
    // Workspace spec 077, C12: only the game master restricts a trait; a tier change keeps the restriction it has
    if (command.purchase.restricted) await this.characterAccess.checkManage(character, command.userId, command.roles);
    const restricted = command.purchase.restricted ?? current?.restricted;
    const isTalent = trait.isTalent;
    const cost = AddTraitHandler.restrictedCost(this.calculateCost(trait, command.tier), isTalent, !!restricted);
    const rules = await loadGameRules(this.gameRepository, character.gameId);
    // Table 4-0 on the cost actually paid (a restricted trait costs half)
    this.validateMaxCost(rules, command.traitId, cost);
    // Adding a tier based trait the character already has with another tier changes it, paying the difference
    const tierChange = !!current && trait.isTierBased && !!current.tier && !!command.tier && command.tier !== current.tier;
    const lowering = tierChange && command.tier < current.tier;
    if (lowering && isTalent) {
      throw new ValidationError(`Trait ${command.traitId} is a talent: its tier cannot be lowered`, 'err-trait-tier-lower-talent');
    }
    // Workspace spec 077, C10: worsening a flaw is for the game master
    if (tierChange && !lowering && !isTalent) await this.characterAccess.checkManage(character, command.userId, command.roles);
    const purchase = await this.purchase(character, trait, current, command, cost, rules, restricted);
    const spending = this.getSpending(character, rules, tierChange ? cost - current.cost : cost, tierChange, command.pool);
    if (lowering) {
      character.reduceTrait(command.traitId, command.specialization, command.tier, cost, spending, purchase);
    } else if (tierChange) {
      character.improveTrait(command.traitId, command.specialization, command.tier, cost, spending, purchase);
    } else {
      const grantedRanks = await this.talentSkillRanks.prepare(character, command.traitId, command.languageRanks);
      character.addTrait(
        command.traitId,
        trait.name,
        isTalent,
        command.tier,
        cost,
        command.specialization,
        spending,
        grantedRanks,
        purchase,
      );
    }
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    const updated = await this.characterRepository.update(character);
    await this.events.publishChanges('character', character);
    return updated;
  }

  /** Workspace spec 077, C12: a restricted talent costs half rounded up, a restricted flaw half rounded towards 0. */
  static restrictedCost(cost: number, isTalent: boolean, restricted: boolean): number {
    if (!restricted) return cost;
    return isTalent ? Math.ceil(cost / 2) : Math.trunc(cost / 2) || 0;
  }

  /**
   * Workspace spec 077: the purchase data of the trait. The link of a flaw is checked whenever it is sent; the rest of
   * the purchase rules (prerequisites per tier, flaws that hinder, one loose flaw) only with the game option
   * talentPurchaseRules (C11).
   */
  private async purchase(
    character: Character,
    trait: TraitResponse,
    current: CharacterTrait | undefined,
    command: AddTraitCommand,
    cost: number,
    rules: GameRules,
    restricted: TraitRestriction | undefined,
  ): Promise<CharacterTraitPurchase> {
    const result: CharacterTraitPurchase = current ? CharacterTrait.purchaseOf(current) : {};
    if (restricted) result.restricted = restricted;
    if (command.purchase.linkedTo && !current) result.linkedTo = command.purchase.linkedTo;
    if (result.linkedTo) {
      const talent = await this.traitClient.getTraitById(result.linkedTo.traitId).catch(() => undefined);
      TalentPurchasePolicy.checkLink(character, trait, command.specialization, result.linkedTo, talent, cost);
    }
    // Without the option a chosen prerequisite is ignored
    if (!rules.options.talentPurchaseRules) return result;
    const chosen = command.purchase.prerequisite;
    if (trait.isTalent) {
      if (chosen && MASTER_PREREQUISITES.includes(chosen.type)) {
        await this.characterAccess.checkManage(character, command.userId, command.roles);
      }
      const acquired = TalentPurchasePolicy.acquisitions(character, trait, current, command.tier ?? 1, command.specialization, chosen);
      if (acquired.length) result.acquiredBy = [...(result.acquiredBy ?? []), ...acquired];
      return result;
    }
    if (!current) {
      const { pendingApproval } = TalentPurchasePolicy.checkHindering(character, trait, command.specialization);
      // Bought by the game master, the flaw is already approved
      if (pendingApproval && !(await this.characterAccess.canManage(character, command.userId, command.roles))) {
        result.pendingApproval = true;
      }
    }
    if (!result.linkedTo) TalentPurchasePolicy.checkLooseLimit(character, trait.id, command.specialization, cost);
    return result;
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
   * The pool the player chooses (workspace spec 076, A3) only applies when the policy fixes none.
   */
  private getSpending(
    character: Character,
    rules: GameRules,
    cost: number,
    isImprovement: boolean,
    pool: DevPointsPoolChoice = 'auto',
  ): TraitSpending {
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
    if (pool === 'normal') {
      return {
        spend: { ...spend, pools: poolsFor(pool) },
        flawPool,
        onInsufficient: () => new ValidationError('Insufficient normal development points to acquire the trait', DEV_POINTS_INSUFFICIENT),
      };
    }
    return { spend: { ...spend, pools: poolsFor(pool) }, flawPool };
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
