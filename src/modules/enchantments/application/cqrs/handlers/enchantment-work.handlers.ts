import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { EnchantmentProject } from '../../../domain/aggregates/enchantment-project.js';
import { ENCHANTMENT_REPOSITORY, type EnchantmentRepository } from '../../ports/enchantment-repository.port.js';
import { EnchantmentAccess } from '../../services/enchantment-access.service.js';
import { EnchantmentPlanning } from '../../services/enchantment-planning.service.js';
import {
  ChangeEnchantmentStatusCommand,
  DeleteEnchantmentCommand,
  ProgressEnchantmentCommand,
  SendEnchantmentFailureRollsCommand,
} from '../commands/enchantment.commands.js';

/** The failure rolls of the failed SCRs, looked up in the tables of core (workspace spec 064). */
@CommandHandler(SendEnchantmentFailureRollsCommand)
export class SendEnchantmentFailureRollsHandler implements ICommandHandler<SendEnchantmentFailureRollsCommand, EnchantmentProject> {
  constructor(
    @Inject(ENCHANTMENT_REPOSITORY) private readonly repository: EnchantmentRepository,
    private readonly access: EnchantmentAccess,
    private readonly planning: EnchantmentPlanning,
  ) {}

  async execute(command: SendEnchantmentFailureRollsCommand): Promise<EnchantmentProject> {
    const { project } = await this.access.findManaged(command.projectId, command.userId, command.roles);
    project.applyFailureRolls(command.rolls, await this.planning.failureLookup());
    return this.repository.update(project);
  }
}

/** Days worked, typed by hand: there is no game calendar (decision 8). */
@CommandHandler(ProgressEnchantmentCommand)
export class ProgressEnchantmentHandler implements ICommandHandler<ProgressEnchantmentCommand, EnchantmentProject> {
  constructor(
    @Inject(ENCHANTMENT_REPOSITORY) private readonly repository: EnchantmentRepository,
    private readonly access: EnchantmentAccess,
  ) {}

  async execute(command: ProgressEnchantmentCommand): Promise<EnchantmentProject> {
    const { project } = await this.access.findManaged(command.projectId, command.userId, command.roles);
    project.progress(command.days);
    return this.repository.update(project);
  }
}

/** Suspend and resume change the status only: the days of a pause do not count. */
@CommandHandler(ChangeEnchantmentStatusCommand)
export class ChangeEnchantmentStatusHandler implements ICommandHandler<ChangeEnchantmentStatusCommand, EnchantmentProject> {
  constructor(
    @Inject(ENCHANTMENT_REPOSITORY) private readonly repository: EnchantmentRepository,
    private readonly access: EnchantmentAccess,
  ) {}

  async execute(command: ChangeEnchantmentStatusCommand): Promise<EnchantmentProject> {
    const { project } = await this.access.findManaged(command.projectId, command.userId, command.roles);
    if (command.action === 'suspend') project.suspend();
    else project.resume();
    return this.repository.update(project);
  }
}

/** Only a completed or cancelled project is deleted. */
@CommandHandler(DeleteEnchantmentCommand)
export class DeleteEnchantmentHandler implements ICommandHandler<DeleteEnchantmentCommand, void> {
  constructor(
    @Inject(ENCHANTMENT_REPOSITORY) private readonly repository: EnchantmentRepository,
    private readonly access: EnchantmentAccess,
  ) {}

  async execute(command: DeleteEnchantmentCommand): Promise<void> {
    const { project } = await this.access.findManaged(command.projectId, command.userId, command.roles);
    project.checkDeletable();
    await this.repository.deleteById(project.id);
  }
}
