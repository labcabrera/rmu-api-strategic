import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { AddFactionXPCommand } from 'src/modules/factions/application/commands/add-faction-xp.command';

export class AddFactionXPDto {
  @ApiProperty({ description: 'XP to add to faction pool', example: 10000 })
  @IsNumber()
  xp: number;

  static toCommand(factionId: string, dto: AddFactionXPDto, userId: string, roles: string[]): AddFactionXPCommand {
    const command = new AddFactionXPCommand();
    command.factionId = factionId;
    command.xp = dto.xp;
    command.userId = userId;
    command.roles = roles;
    return command;
  }
}
