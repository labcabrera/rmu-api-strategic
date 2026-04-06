import { ApiProperty } from '@nestjs/swagger';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { PaginationDto } from 'src/modules/shared/interfaces/http/dto/page.dto';
import { ItemWeaponDto } from './item-weapon.dto';

export class ItemDto {
  @ApiProperty({ description: 'Item identifier', type: String, required: true, example: 'item-001' })
  id: string;

  @ApiProperty({ description: 'Game identifier', type: String, required: true, example: 'strategic-game-001' })
  gameId: string;

  @ApiProperty({ description: 'Faction identifier', type: String, required: false, example: 'faction-001' })
  factionId: string | null;

  @ApiProperty({ description: 'Character identifier', type: String, required: false, example: 'character-001' })
  characterId: string | null;

  @ApiProperty({ description: 'Item type identifier', type: String, required: true, example: 'arming-sword' })
  itemTypeId: string;

  @ApiProperty({ description: 'Game name', type: String, required: true, example: 'Narsil' })
  name: string;

  @ApiProperty({ description: 'Weapon details if the item is a weapon', type: ItemWeaponDto, required: false })
  weapon: ItemWeaponDto | null;

  @ApiProperty({ description: 'Game owner', type: String })
  owner: string;

  static fromEntity(entity: Item): ItemDto {
    const dto = new ItemDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.factionId = entity.factionId;
    dto.characterId = entity.characterId;
    dto.itemTypeId = entity.itemTypeId;
    dto.name = entity.name;
    dto.weapon = entity.weapon ? ItemWeaponDto.fromEntity(entity.weapon) : null;
    dto.owner = entity.owner;
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
