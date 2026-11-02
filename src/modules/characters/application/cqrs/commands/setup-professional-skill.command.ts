import type { ProfessionalBonusType } from '../../../domain/value-objects/professional-bonus-type.vo.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

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
