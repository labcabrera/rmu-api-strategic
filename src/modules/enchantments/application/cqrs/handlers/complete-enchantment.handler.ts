import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { InventorySync } from '../../../../items/application/services/inventory-sync.service.js';
import type { Item } from '../../../../items/domain/aggregates/item.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import type { EnchantmentProject } from '../../../domain/aggregates/enchantment-project.js';
import { EnchantmentOutcomes } from '../../../domain/services/enchantment-outcome.js';
import { ENCHANTMENT_REPOSITORY, type EnchantmentRepository } from '../../ports/enchantment-repository.port.js';
import { EnchantmentAccess } from '../../services/enchantment-access.service.js';
import { EnchantmentPlanning } from '../../services/enchantment-planning.service.js';
import { CompleteEnchantmentCommand } from '../commands/enchantment.commands.js';

export interface EnchantmentCompletion {
  project: EnchantmentProject;
  item: Item;
}

/**
 * Every day worked: the item gets its enchantment, the enchantment modifiers, the item level on its breakage checks
 * and the market value (workspace spec 064, decisions 6 and 7).
 */
@CommandHandler(CompleteEnchantmentCommand)
export class CompleteEnchantmentHandler implements ICommandHandler<CompleteEnchantmentCommand, EnchantmentCompletion> {
  private readonly logger = new Logger(CompleteEnchantmentHandler.name);

  constructor(
    @Inject(ENCHANTMENT_REPOSITORY) private readonly repository: EnchantmentRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly access: EnchantmentAccess,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: CompleteEnchantmentCommand): Promise<EnchantmentCompletion> {
    const { project } = await this.access.findManaged(command.projectId, command.userId, command.roles);
    project.checkCompletable();
    const item = await this.itemRepository.findById(project.itemId);
    if (!item) throw new NotFoundError('Item', project.itemId, 'err-item-not-found');

    const completedAt = new Date();
    const outcome = EnchantmentOutcomes.resolve(project.getProps(), EnchantmentPlanning.itemInfo(item), completedAt);
    item.enchant(outcome.enchantment, outcome.modifiers, outcome.unitValue);
    project.complete(completedAt);
    // The project is written first: a conflict there leaves the item as it was
    const updated = await this.repository.update(project);
    let enchanted: Item;
    try {
      enchanted = await this.itemRepository.update(item);
    } catch (e) {
      this.logger.error(`Project ${project.id} completed but item ${item.id} could not be enchanted: ${(e as Error).message}`);
      throw e;
    }
    await this.events.publishChanges('item', item);
    await this.inventorySync.refresh(enchanted.holder);
    return { project: updated, item: enchanted };
  }
}
