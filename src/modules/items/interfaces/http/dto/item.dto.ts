import { ApiProperty } from '@nestjs/swagger';
import { Item } from '../../../domain/aggregates/item.js';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import { ItemWeaponDto } from './item-weapon.dto.js';
import { ItemInfoDto } from './item-info.dto.js';
import { ItemArmorDto } from './item-armor.dto.js';
import { ItemShieldDto } from './item-shield.dto.js';
import { ItemConditionDto, ItemModifierDto } from './item-modifier.dto.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { ItemCatalogInfo } from '../../../domain/value-objects/item-catalog-info.vo.js';
import type { ItemCoating } from '../../../domain/value-objects/item-coating.vo.js';

export class ItemDto {
  @ApiProperty({ description: 'Version of optimistic concurrency: send it back in the PATCH to detect a concurrent change', example: 0 })
  version: number;

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

  @ApiProperty({ description: 'Shield details if the item is a shield', type: ItemShieldDto, required: false })
  shield: ItemShieldDto | null;

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

  @ApiProperty({ description: 'Modifiers of the item: breakage, quality... (spec 019)', type: [ItemModifierDto] })
  modifiers: ItemModifierDto[];

  @ApiProperty({ description: 'Breakage state derived from the modifiers', type: ItemConditionDto })
  condition: ItemConditionDto;

  @ApiProperty({ description: 'Who holds it (spec 023): the character or the faction of characterId/factionId' })
  holder: ItemHolder;

  @ApiProperty({ description: 'Copy of the catalog type: cost, rarity, production hours, image (spec 023)', nullable: true })
  catalog: ItemCatalogInfo | null;

  @ApiProperty({ description: 'Reference gold of one unit: its value, or the average cost of the type', example: 25 })
  value: number;

  @ApiProperty({ description: 'Gold paid for one unit when it was bought or crafted', nullable: true })
  acquiredPrice: number | null;

  @ApiProperty({ description: 'Game owner', type: String })
  owner: string;

  @ApiProperty({ description: 'Poison on the weapon (workspace spec 042)', type: Object, nullable: true, required: false })
  coating?: ItemCoating | null;

  static fromEntity(entity: Item): ItemDto {
    const dto = new ItemDto();
    dto.version = entity.version;
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.factionId = entity.factionId;
    dto.characterId = entity.characterId;
    dto.itemTypeId = entity.itemTypeId;
    dto.category = entity.category;
    dto.carried = entity.carried;
    dto.name = entity.name;
    dto.weapon = entity.weapon ? ItemWeaponDto.fromEntity(entity.weapon) : null;
    dto.armor = entity.armor ? ItemArmorDto.fromEntity(entity.armor) : null;
    dto.shield = entity.shield ? ItemShieldDto.fromEntity(entity.shield) : null;
    dto.amount = entity.amount;
    dto.info = ItemInfoDto.fromEntity(entity.info);
    dto.modifiers = (entity.modifiers || []).map(modifier => ItemModifierDto.fromEntity(modifier));
    dto.condition = ItemConditionDto.fromEntity(entity.getCondition());
    dto.holder = entity.holder;
    dto.catalog = entity.catalog ?? null;
    dto.value = entity.unitValue;
    dto.acquiredPrice = entity.acquiredPrice ?? null;
    dto.owner = entity.owner;
    dto.coating = entity.coating ?? null;
    return dto;
  }
}

export class ItemPageDto {
  @ApiProperty({
    type: [ItemDto],
    description: 'Games',
  })
  content: ItemDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
