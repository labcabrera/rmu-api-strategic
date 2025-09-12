import { ApiProperty } from '@nestjs/swagger';
import { CharacterArmor, CharacterDefense } from 'src/modules/characters/domain/value-objects/character-defense.vo';

export class CharacterArmorDto {
  at: number | undefined;

  racialAt: number;

  bodyAt: number | undefined;

  headAt: number | undefined;

  armsAt: number | undefined;

  legsAt: number | undefined;

  static fromEntity(entity: CharacterArmor): CharacterArmorDto {
    const dto = new CharacterArmorDto();
    dto.at = entity.at;
    dto.racialAt = entity.racialAt;
    dto.bodyAt = entity.bodyAt;
    dto.headAt = entity.headAt;
    dto.armsAt = entity.armsAt;
    dto.legsAt = entity.legsAt;
    return dto;
  }
}

export class CharacterDefenseDto {
  @ApiProperty({ description: 'Defensive bonus (BD)' })
  defensiveBonus: number;

  @ApiProperty({ description: 'Character armor' })
  armor: CharacterArmorDto;

  static fromEntity(entity: CharacterDefense): CharacterDefenseDto {
    const dto = new CharacterDefenseDto();
    dto.defensiveBonus = entity.defensiveBonus;
    dto.armor = CharacterArmorDto.fromEntity(entity.armor);
    return dto;
  }
}
