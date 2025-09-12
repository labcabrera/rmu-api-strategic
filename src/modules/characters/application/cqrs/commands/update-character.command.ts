export class UpdateCharacterCommand {
  characterId: string;
  name: string | undefined;
  description: string | undefined;
  userId: string;
  roles: string[];
}
