import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_ECONOMY_RULES, type EconomyRules } from '../../domain/services/price-calculator.js';

/** House rules of the economy from the configuration (workspace spec 023, decision 12). */
@Injectable()
export class EconomyRulesProvider {
  constructor(private readonly configService: ConfigService) {}

  rules(overrides: Partial<Pick<EconomyRules, 'salePercent' | 'materialsPercent'>> = {}): EconomyRules {
    const number = (key: string, fallback: number) => {
      const value = Number(this.configService.get(key));
      return Number.isFinite(value) && this.configService.get(key) !== undefined ? value : fallback;
    };
    const [intact, damaged, broken] = String(this.configService.get('RMU_STRATEGIC_CONDITION_PERCENTS') ?? '')
      .split(',')
      .map(Number);
    const conditionPercent = [intact, damaged, broken].every(Number.isFinite)
      ? { intact, damaged, broken }
      : DEFAULT_ECONOMY_RULES.conditionPercent;
    return {
      salePercent: overrides.salePercent ?? number('RMU_STRATEGIC_SALE_PERCENT', DEFAULT_ECONOMY_RULES.salePercent),
      materialsPercent: overrides.materialsPercent ?? number('RMU_STRATEGIC_MATERIALS_PERCENT', DEFAULT_ECONOMY_RULES.materialsPercent),
      conditionPercent,
    };
  }
}
