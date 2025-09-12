import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { AddFactionGoldCommand } from 'src/modules/factions/application/cqrs/commands/add-faction-gold.command';

export class AddFactionGoldDto {
  @ApiProperty({ description: 'Gold to add to faction pool', example: 10 })
  @IsNumber()
  gold: number;

  static toCommand(factionId: string, dto: AddFactionGoldDto, userId: string, roles: string[]): AddFactionGoldCommand {
    const command = new AddFactionGoldCommand();
    command.factionId = factionId;
    command.gold = dto.gold;
    command.userId = userId;
    command.roles = roles;
    return command;
  }
}
