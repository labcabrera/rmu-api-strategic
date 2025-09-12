import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { TransferGoldCommand } from 'src/modules/characters/application/cqrs/commands/transfer-gold.command';

export class TransferGoldDto {
  @ApiProperty({ description: 'Transfer amount. If positive, the gold will be transferred to the character.', example: 10 })
  @IsNumber()
  amount: number;

  static toCommand(characterId: string, dto: TransferGoldDto, userId: string, roles: string[]): TransferGoldCommand {
    return new TransferGoldCommand(characterId, dto.amount, userId, roles);
  }
}
