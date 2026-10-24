import { ApiProperty } from '@nestjs/swagger';
import { CharacterAttack, type WeaponCategory } from '../../../domain/value-objects/character-attack.vo.js';
import { CharacterAttackRange } from '../../../domain/value-objects/character-attack-range.vo.js';

export class CharacterAttackRangeDto {
  from: number;
  to: number;
  bonus: number;

  static fromEntity(entity: CharacterAttackRange): CharacterAttackRangeDto {
    const dto = new CharacterAttackRangeDto();
    dto.from = entity.from;
    dto.to = entity.to;
    dto.bonus = entity.bonus;
    return dto;
  }
}

export class CharacterAttackDto {
  attackName: string;
  attackTable: string;
  sizeAdjustment: number;
  fumbleTable: string;
  fumble: number;
  weaponFumble: number;
  bo: number;
  type: string;
  defaultAttack: boolean;
  meleeRange: number | null;
  ranges: CharacterAttackRangeDto[] | null;
  boModifiers: Record<string, number>;

  @ApiProperty({ description: 'Whether the attack uses a two-handed weapon mode', type: Boolean, example: false })
  twoHanded: boolean;

  @ApiProperty({
    type: String,
    description: 'Weapon category used by multiple attack rules',
    enum: ['dagger', 'light', 'natural', 'standard'],
    example: 'standard',
  })
  weaponCategory: WeaponCategory;

  @ApiProperty({ description: 'Whether the weapon is made for a different size than the wielder', type: Boolean, example: false })
  wrongSize: boolean;

  @ApiProperty({
    description: "Skill used by the attack ('shield' for shield attacks)",
    type: String,
    nullable: true,
    example: 'melee-weapon@blade',
  })
  skillId: string | null;

  @ApiProperty({ description: 'Strategic item of the attack (spec 019)', type: String, nullable: true, example: 'item-001' })
  itemId: string | null;

  static fromEntity(entity: CharacterAttack): CharacterAttackDto {
    const dto = new CharacterAttackDto();
    dto.attackName = entity.attackName;
    dto.attackTable = entity.attackTable;
    dto.sizeAdjustment = entity.sizeAdjustment;
    dto.fumbleTable = entity.fumbleTable;
    dto.fumble = entity.fumble;
    dto.weaponFumble = entity.weaponFumble;
    dto.bo = entity.bo;
    dto.type = entity.type;
    dto.defaultAttack = entity.defaultAttack;
    dto.meleeRange = entity.meleeRange;
    dto.ranges = entity.ranges ? entity.ranges.map(range => CharacterAttackRangeDto.fromEntity(range)) : null;
    dto.boModifiers = entity.boModifiers;
    dto.twoHanded = entity.twoHanded ?? false;
    dto.weaponCategory = entity.weaponCategory ?? 'standard';
    dto.wrongSize = entity.wrongSize ?? false;
    dto.skillId = entity.skillId ?? null;
    dto.itemId = entity.itemId ?? null;
    return dto;
  }
}
