import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { EnchantmentRequest } from '../../../domain/aggregates/enchantment-project.js';

/** The plan of an enchantment, without starting it (workspace spec 064). */
export class QuoteEnchantmentQuery extends AuthenticatedCommand {
  constructor(
    public readonly request: EnchantmentRequest,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class GetEnchantmentQuery extends AuthenticatedCommand {
  constructor(
    public readonly projectId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class GetEnchantmentsQuery extends AuthenticatedCommand {
  constructor(
    public readonly rsql: string | undefined,
    public readonly page: number,
    public readonly size: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
