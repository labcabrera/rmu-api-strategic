import { CreateGameCommand } from 'src/modules/games/application/commands/create-game.command';

export class CreateGameDto {
  name: string;
  realm: string;
  description: string | undefined;

  static toCommand(dto: CreateGameDto, userId: string, roles: string[]): CreateGameCommand {
    return {
      ...dto,
      userId,
      roles,
    };
  }
}
