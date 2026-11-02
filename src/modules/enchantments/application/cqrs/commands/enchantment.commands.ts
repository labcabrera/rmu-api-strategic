import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ItemHolder } from '../../../../items/domain/value-objects/item-holder.vo.js';
import type { EnchantmentRequest } from '../../../domain/aggregates/enchantment-project.js';

/** Starts an enchantment (workspace spec 064): the SCR rolls and who pays the materials (by default the item holder). */
export class CreateEnchantmentCommand extends AuthenticatedCommand {
  constructor(
    public readonly request: EnchantmentRequest,
    public readonly scrRolls: Record<string, number>,
    /** undefined: the holder of the item; null: nobody pays. */
    public readonly payer: ItemHolder | null | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class SendEnchantmentFailureRollsCommand extends AuthenticatedCommand {
  constructor(
    public readonly projectId: string,
    public readonly rolls: Record<string, number>,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class ProgressEnchantmentCommand extends AuthenticatedCommand {
  constructor(
    public readonly projectId: string,
    public readonly days: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export type EnchantmentStatusAction = 'suspend' | 'resume';

export class ChangeEnchantmentStatusCommand extends AuthenticatedCommand {
  constructor(
    public readonly projectId: string,
    public readonly action: EnchantmentStatusAction,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class UpdateEnchantmentCommand extends AuthenticatedCommand {
  constructor(
    public readonly projectId: string,
    public readonly changes: { extraDays?: number; extraCost?: number; notes?: string | null; version?: number },
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class CompleteEnchantmentCommand extends AuthenticatedCommand {
  constructor(
    public readonly projectId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class CancelEnchantmentCommand extends AuthenticatedCommand {
  constructor(
    public readonly projectId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class DeleteEnchantmentCommand extends AuthenticatedCommand {
  constructor(
    public readonly projectId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
