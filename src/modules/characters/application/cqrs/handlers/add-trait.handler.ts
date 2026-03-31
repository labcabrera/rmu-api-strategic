import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import type { CharacterRepository } from '../../ports/character.repository';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';
import { AddTraitCommand } from '../commands/add-trait.command';
import type { TraitClientPort, TraitResponse } from '../../ports/trait-client.port';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(AddTraitCommand)
export class AddTraitHandler implements ICommandHandler<AddTraitCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('TraitClient') private readonly traitClient: TraitClientPort,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
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
    character.addTrait(command.traitId, trait.name, isTalent, command.tier, cost, command.specialization);
    this.characterProcessorService.process(character);
    const updated = await this.characterRepository.update(character.id, character);
    character.getUncommittedEvents().forEach((event) => this.characterEventBus.publish(event));
    return updated;
  }

  private validateCommand(command: AddTraitCommand, trait: TraitResponse): void {
    if (command.tier && command.tier < 1) {
      throw new ValidationError(`Trait ${command.traitId} tier must be greater than 0`);
    }
    if (trait.isTierBased && !command.tier) {
      throw new ValidationError(`Trait ${command.traitId} is tier based, tier must be defined`);
    }
    if (!trait.isTierBased && command.tier) {
      throw new ValidationError(`Trait ${command.traitId} is not tier based, tier must be undefined`);
    }
    if (command.tier && trait.maxTier && command.tier > trait.maxTier) {
      throw new ValidationError(`Trait ${command.traitId} max tier is ${trait.maxTier}, tier must be less or equal than max tier`);
    }
    if (trait.specialization && !command.specialization) {
      throw new ValidationError(`Trait ${command.traitId} requires a specialization value`);
    }
    if (!trait.specialization && command.specialization) {
      throw new ValidationError(`Trait ${command.traitId} does not require a specialization value`);
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
