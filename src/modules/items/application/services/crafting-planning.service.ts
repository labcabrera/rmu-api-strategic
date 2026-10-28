import { Inject, Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { type CraftingPlan, CraftingPlanner, type CraftingQuality } from '../../domain/services/crafting-plan.js';
import { PriceCalculator } from '../../domain/services/price-calculator.js';
import type { ItemResponse } from '../ports/item-client.port.js';
import { MATERIAL_CLIENT, type MaterialClientPort } from '../ports/material-client.port.js';
import { EconomyRulesProvider } from './economy-rules.provider.js';

export interface CraftingPlanOptions {
  amount?: number;
  quality?: CraftingQuality | null;
  materialsCost?: number;
  enhancementsCost?: number;
}

/** Plan of a craft with the material of core and the house rules (workspace spec 043, decision 3). */
@Injectable()
export class CraftingPlanning {
  constructor(
    @Inject(MATERIAL_CLIENT) private readonly materials: MaterialClientPort,
    private readonly rules: EconomyRulesProvider,
  ) {}

  async plan(itemType: ItemResponse, options: CraftingPlanOptions): Promise<CraftingPlan> {
    const amount = options.amount ?? 1;
    PriceCalculator.checkAmount(amount);
    const quality = options.quality ?? {};
    const material = quality.materialId ? await this.materials.getMaterial(quality.materialId) : null;
    if (quality.materialId && !material) {
      throw new ValidationError(`Invalid material ${quality.materialId}`, 'err-crafting-material-not-found');
    }
    return CraftingPlanner.plan({
      itemType: {
        category: itemType.category,
        weapon: itemType.weapon,
        armor: itemType.armor,
        shield: itemType.shield,
        info: { cost: itemType.info.cost, productionHours: itemType.info.productionHours ?? null },
      },
      amount,
      quality,
      material: material ?? null,
      materialsPercent: this.rules.rules().materialsPercent,
      materialsCost: options.materialsCost,
      enhancementsCost: options.enhancementsCost,
    });
  }
}
