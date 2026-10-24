import { CharacterRoleplayInfo } from '../../../infrastructure/persistence/models/character-childs.model.js';

export class UpdateCharacterCommand {
  constructor(
    public readonly characterId: string,
    public readonly name: string | undefined,
    public readonly info:
      | {
          weight?: number;
          height?: number;
        }
      | undefined,
    public readonly roleplay: CharacterRoleplayInfo | undefined,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
