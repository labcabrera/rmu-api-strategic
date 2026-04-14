import { ApiProperty } from '@nestjs/swagger';
import { CharacterArmor, CharacterDefense, CharacterShield } from 'src/modules/characters/domain/value-objects/character-defense.vo';

export class CharacterArmorDto {
  @ApiProperty({ description: 'Armor type (AT)', required: false, example: 5 })
  at: number | null;

  @ApiProperty({ description: 'Racial armor type (Racial AT)', example: 1 })
  racialAt: number;

  @ApiProperty({ description: 'Body armor type (Body AT)', required: false, example: 3 })
  bodyAt: number | null;

  @ApiProperty({ description: 'Head armor type (Head AT)', required: false, example: 2 })
  headAt: number | null;

  @ApiProperty({ description: 'Arms armor type (Arms AT)', required: false, example: 2 })
  armsAt: number | null;

  @ApiProperty({ description: 'Legs armor type (Legs AT)', required: false, example: 3 })
  legsAt: number | null;

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

export class CharacterShieldDto {
  @ApiProperty({ description: 'Shield defensive bonus', required: false, example: 4 })
  db: number;

  @ApiProperty({ description: 'Shield defensive bonus', required: false, example: 4 })
  blockCount: number;

  static fromEntity(shield: CharacterShield): CharacterShieldDto {
    const dto = new CharacterShieldDto();
    dto.db = shield.db;
    dto.blockCount = shield.blockCount;
    return dto;
  }
}

export class CharacterDefenseDto {
  @ApiProperty({ description: 'Defensive bonus (BD)' })
  defensiveBonus: number;

  @ApiProperty({ description: 'Character armor' })
  armor: CharacterArmorDto;

  @ApiProperty({ description: 'Character shield', required: false })
  shield: CharacterShieldDto | null;

  static fromEntity(entity: CharacterDefense): CharacterDefenseDto {
    const dto = new CharacterDefenseDto();
    dto.defensiveBonus = entity.defensiveBonus;
    dto.armor = CharacterArmorDto.fromEntity(entity.armor);
    dto.shield = entity.shield ? CharacterShieldDto.fromEntity(entity.shield) : null;
    return dto;
  }
}
