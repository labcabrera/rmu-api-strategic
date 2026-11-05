import { ApiProperty } from '@nestjs/swagger';
import { CharacterXP, type IntenseTrainingSkill, type StatGainPayment } from '../../../domain/value-objects/character-xp.vo.js';
import type { WeaponDevelopmentType } from '../../../domain/value-objects/weapon-development-type.vo.js';

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

  @ApiProperty({ description: 'Available bonus development points (race extra points plus the game master creation bonus)', example: 25 })
  availableBonusDevPoints: number;

  @ApiProperty({ description: 'Bonus development points spent in the current level, limited by the game power level', example: 10 })
  bonusDevPointsSpentThisLevel: number;

  @ApiProperty({ description: "Points returned by flaws at creation under the 'flaw-points-at-creation' talent policy", example: 0 })
  flawDevPoints: number;

  @ApiProperty({ description: 'Available temporary stat updates', example: 2 })
  availableStatLevelUp: number;

  @ApiProperty({ description: 'Number of temporary stats updated used in this level', example: 2 })
  developedStatLevelUp: number;

  @ApiProperty({ description: 'Order for development points', example: 2 })
  weaponDevelopment: WeaponDevelopmentType[];

  @ApiProperty({
    description: 'The skill trained intensely this level, the only one with more than two ranks (workspace spec 076)',
    required: false,
    nullable: true,
    example: { skillId: 'riding', specialization: 'horse' },
  })
  intenseTrainingSkill: IntenseTrainingSkill | null;

  @ApiProperty({ description: 'Normal points saved at the last level up, included in availableDevPoints (workspace spec 076)', example: 0 })
  savedDevPoints: number;

  @ApiProperty({
    description: 'Extra stat gain rolls paid with development points in the last two levels, by pool (workspace spec 076)',
    example: [{ stat: 'ag', normal: 4, bonus: 0, level: 2 }],
  })
  statGainPayments: StatGainPayment[];

  static fromEntity(entity: CharacterXP): CharacterXPDto {
    const dto = new CharacterXPDto();
    dto.level = entity.level;
    dto.availableLevel = entity.availableLevel;
    dto.xp = entity.xp;
    dto.devPoints = entity.devPoints;
    dto.availableDevPoints = entity.availableDevPoints;
    dto.availableBonusDevPoints = entity.availableBonusDevPoints ?? 0;
    dto.bonusDevPointsSpentThisLevel = entity.bonusDevPointsSpentThisLevel ?? 0;
    dto.flawDevPoints = entity.flawDevPoints ?? 0;
    dto.availableStatLevelUp = entity.availableStatLevelUp ?? 0;
    dto.developedStatLevelUp = entity.developedStatLevelUp ?? 0;
    dto.weaponDevelopment = entity.weaponDevelopment;
    dto.intenseTrainingSkill = entity.intenseTrainingSkill ?? null;
    dto.savedDevPoints = entity.savedDevPoints ?? 0;
    dto.statGainPayments = (entity.statGainPayments || []).map(p => ({ ...p }));
    return dto;
  }
}
