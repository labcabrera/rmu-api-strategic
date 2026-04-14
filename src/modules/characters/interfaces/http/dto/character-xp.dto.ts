import { ApiProperty } from '@nestjs/swagger';
import { CharacterXP } from 'src/modules/characters/domain/value-objects/character-xp.vo';
import { WeaponDevelopmentType } from 'src/modules/characters/domain/value-objects/weapon-development-type.vo';

export class CharacterXPDto {
  @ApiProperty({ description: 'Current developed level of the character', example: 2 })
  level: number;

  @ApiProperty({ description: 'Current available level of the character', example: 1 })
  availableLevel: number;

  @ApiProperty({ description: 'Total experience points accumulated by the character', example: 25000 })
  xp: number;

  @ApiProperty({ description: 'Total development points earned by the character when level up', example: 60 })
  devPoints: number;

  @ApiProperty({ description: 'Available development points for this level', example: 42 })
  availableDevPoints: number;

  @ApiProperty({ description: 'Available race development points', example: 12 })
  availableRaceDevPoints: number;

  @ApiProperty({ description: 'Available temporary stat updates', example: 2 })
  availableStatLevelUp: number;

  @ApiProperty({ description: 'Number of temporary stats updated used in this level', example: 2 })
  developedStatLevelUp: number;

  @ApiProperty({ description: 'Order for development points', example: 2 })
  weaponDevelopment: WeaponDevelopmentType[];

  static fromEntity(entity: CharacterXP): CharacterXPDto {
    const dto = new CharacterXPDto();
    dto.level = entity.level;
    dto.availableLevel = entity.availableLevel;
    dto.xp = entity.xp;
    dto.devPoints = entity.devPoints;
    dto.availableDevPoints = entity.availableDevPoints;
    dto.availableRaceDevPoints = entity.availableRaceDevPoints;
    dto.availableStatLevelUp = entity.availableStatLevelUp ?? 0;
    dto.developedStatLevelUp = entity.developedStatLevelUp ?? 0;
    dto.weaponDevelopment = entity.weaponDevelopment;
    return dto;
  }
}
