import { ApiProperty } from '@nestjs/swagger';
import { CollectionStatsDto } from './collection-stats.dto.js';

export class StrategicStatsDto {
  @ApiProperty({ description: 'Campaigns (strategic games) by status', type: CollectionStatsDto })
  campaigns: CollectionStatsDto;

  @ApiProperty({ description: 'Characters by status', type: CollectionStatsDto })
  characters: CollectionStatsDto;

  @ApiProperty({ description: 'Factions', type: CollectionStatsDto })
  factions: CollectionStatsDto;
}
