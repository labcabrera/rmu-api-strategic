import { ApiProperty } from '@nestjs/swagger';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { PaginationDto } from 'src/modules/shared/interfaces/http/dto/page.dto';
import { ItemWeaponDto } from './item-weapon.dto';
import { ItemInfoDto } from './item-info.dto';
import { ItemArmorDto } from './item-armor.dto';

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

  @ApiProperty({ description: 'Item category', type: String, required: true, example: 'weapon' })
  category: string;

  @ApiProperty({ description: 'Whether the item is currently carried by a character', type: Boolean, required: true, example: true })
  carried: boolean;

  @ApiProperty({ description: 'Weapon details if the item is a weapon', type: ItemWeaponDto, required: false })
  weapon: ItemWeaponDto | null;

  @ApiProperty({ description: 'Armor details if the item is armor', type: ItemArmorDto, required: false })
  armor: ItemArmorDto | null;

  @ApiProperty({ description: 'Whether the item is stackable', type: Boolean, required: true, example: false })
  stackable: boolean;

  @ApiProperty({ description: 'Amount of items in the stack if stackable', type: Number, required: false, example: 10 })
  amount: number | null;

  @ApiProperty({
    description: 'Item description',
    type: String,
    required: false,
    example: 'A legendary sword forged in the fires of Mount Doom.',
  })
  description: string | null;

  @ApiProperty({ description: 'Item information', type: ItemInfoDto, required: true })
  info: ItemInfoDto;

  @ApiProperty({ description: 'Game owner', type: String })
  owner: string;

  static fromEntity(entity: Item): ItemDto {
    const dto = new ItemDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.factionId = entity.factionId;
    dto.characterId = entity.characterId;
    dto.itemTypeId = entity.itemTypeId;
    dto.category = entity.category;
    dto.carried = entity.carried;
    dto.name = entity.name;
    dto.armor = entity.armor ? ItemArmorDto.fromEntity(entity.armor) : null;
    dto.weapon = entity.weapon ? ItemWeaponDto.fromEntity(entity.weapon) : null;
    dto.info = ItemInfoDto.fromEntity(entity.info);
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
