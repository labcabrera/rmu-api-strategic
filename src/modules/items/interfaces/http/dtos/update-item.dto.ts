import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UpdateItemCommand } from 'src/modules/items/application/cqrs/commands/update-item.command';

export class UpdateItemDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Game short description', example: 'Game short description' })
  @IsString()
  @IsOptional()
  shortDescription: string | undefined;

  @ApiProperty({ description: 'Game description', example: 'A thrilling campaign set in Middle-earth' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  @ApiProperty({ description: 'Game image URL', example: '/foo/bar/image.png' })
  @IsString()
  @IsOptional()
  imageUrl: string | undefined;

  static toCommand(itemId: string, dto: UpdateItemDto, userId: string, roles: string[]): UpdateItemCommand {
    throw new Error('Not implemented yet');
  }
}
