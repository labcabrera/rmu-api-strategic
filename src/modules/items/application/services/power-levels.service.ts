import { Inject, Injectable } from '@nestjs/common';
import { ALCHEMY_TABLES_CLIENT, type AlchemyTablesClientPort } from '../../../enchantments/application/ports/alchemy-tables-client.port.js';
import { DEFAULT_POWER_LEVEL, type PowerLevel } from '../../../enchantments/domain/value-objects/alchemy.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';

/**
 * Multiplier of the power level of the campaign (Treasure Law table 5-3d, workspace specs 064 and 067): it applies to
 * the magic part of a price, never to the base item. The book prices are the Superior ones (multiplier 1), so that
 * level needs no tables.
 */
@Injectable()
export class PowerLevels {
  constructor(@Inject(ALCHEMY_TABLES_CLIENT) private readonly alchemyTables: AlchemyTablesClientPort) {}

  async multiplier(powerLevel: PowerLevel | null | undefined): Promise<number> {
    const level = powerLevel ?? DEFAULT_POWER_LEVEL;
    if (level === DEFAULT_POWER_LEVEL) return 1;
    const value = (await this.alchemyTables.getAlchemyTables())?.powerLevels?.[level];
    if (typeof value === 'number' && value > 0) return value;
    throw new ValidationError(`Core has no multiplier for the power level ${level}`, 'err-enchantment-power-level-unknown');
  }
}
