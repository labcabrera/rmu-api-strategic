import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';
import type {
  BodyLocation,
  BodySide,
  InjuryFlag,
  InjurySeverity,
  InjurySource,
  InjuryType,
} from 'src/modules/characters/domain/value-objects/injury.vo';

export interface NewInjuryProps {
  type: InjuryType;
  severity?: InjurySeverity;
  location?: BodyLocation;
  side?: BodySide;
  penalty: number;
  bleeding?: number;
  flags?: InjuryFlag[];
  description?: string;
  source?: InjurySource;
}

export class AddInjuryCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly injury: NewInjuryProps,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
