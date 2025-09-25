import { Race, SexBasedAttribute } from '../../ports/race-client.port';

export class UpdateCharacterRaceCommand {
  private constructor(
    public readonly characterId: string,
    public readonly raceName: string | undefined,
    public readonly sizeId: string | undefined,
    public readonly stats: Map<string, number> | undefined,
    public readonly resistances: Map<string, number> | undefined,
    public readonly averageHeight: SexBasedAttribute | undefined,
    public readonly averageWeight: SexBasedAttribute | undefined,
    public readonly strideBonus: number | undefined,
    public readonly enduranceBonus: number | undefined,
    public readonly recoveryMultiplier: number | undefined,
    public readonly baseHits: number | undefined,
    public readonly baseDevPoints: number | undefined,
    public readonly baseAt: number | undefined,
    public readonly talents: string[] | undefined,
  ) {}

  static create(
    characterId: string,
    props: Partial<Omit<Race, 'realmId' | 'realmName' | 'description'>>,
  ): UpdateCharacterRaceCommand {
    return new UpdateCharacterRaceCommand(
      characterId,
      props.name,
      props.sizeId,
      props.stats,
      props.resistances,
      props.averageHeight,
      props.averageWeight,
      props.strideBonus,
      props.enduranceBonus,
      props.recoveryMultiplier,
      props.baseHits,
      props.baseDevPoints,
      props.baseAt,
      props.talents,
    );
  }
}
