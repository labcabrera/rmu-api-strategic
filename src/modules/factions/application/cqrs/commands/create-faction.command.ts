export class CreateFactionCommand {
  gameId: string;
  name: string;
  availableGold: number | undefined;
  availableXP: number | undefined;
  description: string | undefined;
  userId: string;
  roles: string[];
}
