import { ProfessionalBonusType } from 'src/modules/characters/domain/value-objects/professional-bonus-type.vo';

export class SetUpProfessionalSkillCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly types: ProfessionalBonusType[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
