import { CharacterMovement } from '../../../domain/value-objects/character-movement.vo.js';

export class CharacterMovementDto {
  baseMovementRate: number;
  modifiers: Record<string, number>;
  maxPace: string;

  static fromEntity(movement: CharacterMovement): CharacterMovementDto {
    const dto = new CharacterMovementDto();
    dto.baseMovementRate = movement.baseMovementRate;
    dto.modifiers = movement.modifiers;
    dto.maxPace = movement.maxPace;
    return dto;
  }
}
