import { SkillBonus } from 'src/modules/characters/domain/value-objects/skill-bonus.vo';
import { Race } from '../../ports/race-client.port';

export interface UpdateCharacterRaceCommandProps
  extends Partial<Omit<Race, 'realmId' | 'realmName' | 'averageHeight' | 'averageWeight' | 'description'>> {
  characterId: string;
}

export class UpdateCharacterRaceCommand {
  private constructor(
    public readonly characterId: string,
    public readonly name: string | undefined,
    public readonly sizeId: string | undefined,
    public readonly stats: Record<string, number> | undefined,
    public readonly resistances: Map<string, number> | undefined,
    public readonly strideBonus: number | undefined,
    public readonly enduranceBonus: number | undefined,
    public readonly recoveryMultiplier: number | undefined,
    public readonly baseHits: number | undefined,
    public readonly baseDevPoints: number | undefined,
    public readonly baseAt: number | undefined,
    public readonly talents: string[] | undefined,
    public readonly skillBonuses: SkillBonus[] | undefined,
  ) {}

  static create(props: UpdateCharacterRaceCommandProps): UpdateCharacterRaceCommand {
    return new UpdateCharacterRaceCommand(
      props.characterId,
      props.name,
      props.sizeId,
      props.stats,
      props.resistances,
      props.strideBonus,
      props.enduranceBonus,
      props.recoveryMultiplier,
      props.baseHits,
      props.baseDevPoints,
      props.baseAt,
      props.talents,
      props.skillBonuses,
    );
  }
}
