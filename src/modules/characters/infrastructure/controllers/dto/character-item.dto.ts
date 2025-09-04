import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CharacterItemInfoDto } from './character-item-info.dto';
import { CharacterItemWeaponDto, CharacterItemWeaponRangeDto } from './character-item-weapon.dto';
import { CharacterItemArmorDto } from './character-item-armor.dto';
import { CharacterItem } from 'src/modules/characters/domain/entities/character-item.entity';

export class CharacterItemDto {
  id: string;
  name: string;
  itemTypeId: string;
  category: string;
  carried: boolean;
  weapon: CharacterItemWeaponDto | undefined;
  weaponRange: CharacterItemWeaponRangeDto[] | undefined;
  armor: CharacterItemArmorDto | undefined;
  info: CharacterItemInfoDto;
  stackable: boolean | undefined;
  amount: number | undefined;
  description: string | undefined;

  static fromEntity(item: CharacterItem): CharacterItemDto {
    const dto = new CharacterItemDto();
    dto.id = item.id;
    dto.name = item.name;
    dto.itemTypeId = item.itemTypeId;
    dto.category = item.category;
    dto.carried = item.carried;
    dto.weapon = item.weapon ? CharacterItemWeaponDto.fromEntity(item.weapon) : undefined;
    dto.armor = item.armor ? CharacterItemArmorDto.fromEntity(item.armor) : undefined;
    dto.info = CharacterItemInfoDto.fromEntity(item.info);
    dto.stackable = item.stackable;
    dto.amount = item.amount;
    dto.description = item.description;
    return dto;
  }
}

export class CharacterItemCreationDto {
  @ApiProperty({ description: 'The name of the item' })
  @IsString()
  @IsOptional()
  name: string | undefined;

  @ApiProperty({ description: 'The name of the item' })
  @IsString()
  @IsNotEmpty()
  itemTypeId: string;
}
