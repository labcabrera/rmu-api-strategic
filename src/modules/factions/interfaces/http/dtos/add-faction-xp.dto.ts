import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { AddFactionXPCommand } from 'src/modules/factions/application/cqrs/commands/add-faction-xp.command';

export class AddFactionXPDto {
  @ApiProperty({ description: 'XP to add to faction pool', example: 10000 })
  @IsNumber()
  xp: number;

  static toCommand(factionId: string, dto: AddFactionXPDto, userId: string, roles: string[]): AddFactionXPCommand {
    return new AddFactionXPCommand(factionId, dto.xp, userId, roles);
  }
}
