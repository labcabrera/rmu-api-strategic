import { ProfessionalBonusType } from 'src/modules/characters/domain/value-objects/professional-bonus-type.vo';
import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class SetUpProfessionalSkillCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly specialization: string | null,
    public readonly types: ProfessionalBonusType[],
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
