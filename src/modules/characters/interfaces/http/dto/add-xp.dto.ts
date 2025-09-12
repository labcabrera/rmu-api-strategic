import { IsNumber } from 'class-validator';
import { AddXPCommand } from 'src/modules/characters/application/cqrs/commands/add-xp.command';

export class AddXPDto {
  @IsNumber()
  xp: number;

  static toCommand(characterId: string, dto: AddXPDto, userId: string, roles: string[]): AddXPCommand {
    return new AddXPCommand(characterId, dto.xp, userId, roles);
  }
}
