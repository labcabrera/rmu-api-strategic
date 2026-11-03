import { ApiProperty } from '@nestjs/swagger';
import { Character } from '../../../domain/aggregates/character.js';
import type { CharacterView } from '../../../../factions/application/services/faction-access.service.js';
import { NamedEntityDto } from '../../../../shared/interfaces/http/dto/named-entity.dto.js';
import { CharacterDto } from './character.dto.js';

class CharacterSummaryInfoDto {
  @ApiProperty({ type: NamedEntityDto }) race: NamedEntityDto;
  @ApiProperty() professionId: string;
}

class CharacterSummaryExperienceDto {
  @ApiProperty() level: number;
}

/**
 * What the members of a game who are not in the faction of a character see of it (spec 071, decision 11): the same
 * paths as the sheet, so cards read both.
 */
export class CharacterSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() gameId: string;
  @ApiProperty({ type: NamedEntityDto }) faction: NamedEntityDto;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, required: false }) imageUrl?: string;
  @ApiProperty() owner: string;
  @ApiProperty({ type: CharacterSummaryInfoDto }) info: CharacterSummaryInfoDto;
  @ApiProperty({ type: CharacterSummaryExperienceDto }) experience: CharacterSummaryExperienceDto;
  @ApiProperty({ enum: ['summary'] }) access: 'summary';
  @ApiProperty({ enum: [true] }) summary: true;

  static fromEntity(entity: Character): CharacterSummaryDto {
    return Object.assign(new CharacterSummaryDto(), {
      id: entity.id,
      gameId: entity.gameId,
      faction: { id: entity.faction.id, name: entity.faction.name },
      name: entity.name,
      imageUrl: entity.imageUrl,
      owner: entity.owner,
      info: { race: { id: entity.info.race.id, name: entity.info.race.name }, professionId: entity.info.professionId },
      experience: { level: entity.experience.level },
      access: 'summary' as const,
      summary: true as const,
    });
  }

  /** The sheet, or the summary (spec 071). */
  static forView(entity: Character, view: CharacterView): CharacterDto | CharacterSummaryDto {
    if (view === 'summary') return CharacterSummaryDto.fromEntity(entity);
    return Object.assign(CharacterDto.fromEntity(entity), { access: 'full' as const });
  }
}
