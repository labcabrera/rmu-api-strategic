import { ApiProperty } from '@nestjs/swagger';
import type { GameStatus } from 'src/modules/games/domain/value-objects/game-status.vo';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { PaginationDto } from 'src/modules/shared/interfaces/http/dto/page.dto';

export class ItemDto {
  @ApiProperty({ description: 'Game identifier', type: String })
  id: string;

  @ApiProperty({ description: 'Game name', type: String })
  name: string;

  @ApiProperty({ description: 'Game realm identifier', type: String })
  realmId: string;

  @ApiProperty({ description: 'Game realm name', type: String })
  realmName: string;

  @ApiProperty({ description: 'Game status', type: String })
  status: GameStatus;

  @ApiProperty({ description: 'Game description', type: String, required: false })
  description: string | undefined;

  @ApiProperty({ description: 'Game image URL', type: String, required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Game owner', type: String })
  owner: string;

  static fromEntity(entity: Item): ItemDto {
    const dto = new ItemDto();
    dto.id = entity.id;
    //TODO
    return dto;
  }
}

export class ItemPageDto {
  @ApiProperty({
    type: [ItemDto],
    description: 'Games',
    isArray: true,
  })
  content: ItemDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
