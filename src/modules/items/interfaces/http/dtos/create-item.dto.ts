import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateItemCommand } from 'src/modules/items/application/cqrs/commands/create-item.command';

export class CreateItemDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Realm identifier from core module', example: 'lotr' })
  @IsString()
  @IsNotEmpty()
  realmId: string;

  @ApiProperty({ description: 'Game short description', example: 'Short game description' })
  @IsString()
  @IsOptional()
  shortDescription: string | undefined;

  @ApiProperty({
    description: 'Game description',
    example: 'A thrilling campaign set in Middle-earth with largue text',
  })
  @IsString()
  @IsOptional()
  description: string | undefined;

  static toCommand(dto: CreateItemDto, userId: string, roles: string[]): CreateItemCommand {
    throw new Error('Not implemented yet');
  }
}
