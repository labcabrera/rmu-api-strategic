export class CreateFactionCommand {
  gameId: string;
  name: string;
  description: string | undefined;
  userId: string;
  roles: string[];
}
