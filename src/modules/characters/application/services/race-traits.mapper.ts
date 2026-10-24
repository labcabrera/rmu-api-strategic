import { Logger } from '@nestjs/common';
import type { RaceTrait } from '../ports/race-client.port';
import type { TraitClientPort } from '../ports/trait-client.port';
import { RaceTraitProps } from '../../domain/value-objects/race-trait-props.vo';

const logger = new Logger('RaceTraitsMapper');

// Race documents only reference the trait id, so the name is read from the trait catalog
export async function mapRaceTraits(raceTraits: RaceTrait[] | undefined | null, traitClient: TraitClientPort): Promise<RaceTraitProps[]> {
  const names = new Map<string, string>();
  const result: RaceTraitProps[] = [];
  for (const raceTrait of raceTraits || []) {
    if (!raceTrait?.traitId) {
      continue;
    }
    if (!names.has(raceTrait.traitId)) {
      names.set(raceTrait.traitId, await fetchTraitName(raceTrait.traitId, traitClient));
    }
    result.push({
      traitId: raceTrait.traitId,
      traitName: names.get(raceTrait.traitId),
      isTalent: raceTrait.isTalent ?? true,
      tier: raceTrait.tier,
      specialization: raceTrait.specialization,
    });
  }
  return result;
}

async function fetchTraitName(traitId: string, traitClient: TraitClientPort): Promise<string> {
  try {
    const trait = await traitClient.getTraitById(traitId);
    return trait?.name || traitId;
  } catch (e) {
    logger.warn(`Trait ${traitId} not found in the catalog: ${(e as Error).message}`);
    return traitId;
  }
}
