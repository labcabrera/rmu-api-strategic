import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { FACTION_NPC_MAX_COUNT, FACTION_NPC_MIN_COUNT, type FactionNpc } from '../../../domain/value-objects/faction-npc.vo.js';

/** An NPC of the faction (workspace spec 055). */
export class FactionNpcDto {
  @ApiProperty({ description: 'Id of the entry (uuid)', example: '0b5e5b8e-4c1f-4f3e-9d47-2f3f4a1b2c3d' })
  id: string;

  @ApiProperty({ description: 'Id of the NPC in rmu-api-npcs', example: 'wolf' })
  npcId: string;

  @ApiProperty({ description: 'Alias of the NPC in the campaign', example: 'Gate guards' })
  name: string;

  @ApiProperty({ description: 'Number of specimens', minimum: FACTION_NPC_MIN_COUNT, maximum: FACTION_NPC_MAX_COUNT, example: 2 })
  count: number;

  @ApiProperty({ type: String, nullable: true, description: 'Notes', example: null })
  notes: string | null;

  static fromEntity(npc: FactionNpc): FactionNpcDto {
    const dto = new FactionNpcDto();
    dto.id = npc.id;
    dto.npcId = npc.npcId;
    dto.name = npc.name;
    dto.count = npc.count;
    dto.notes = npc.notes;
    return dto;
  }
}

/** An entry of the PATCH: without id it is new, and without name it takes the NPC's. */
export class FactionNpcInputDto {
  @ApiPropertyOptional({ description: 'Id of an existing entry; a new one gets a uuid' })
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: 'Id of the NPC in rmu-api-npcs', example: 'wolf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  npcId: string;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Alias in the campaign; the NPC name by default' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string | null;

  @ApiProperty({ description: 'Number of specimens', minimum: FACTION_NPC_MIN_COUNT, maximum: FACTION_NPC_MAX_COUNT, example: 2 })
  @IsInt()
  @Min(FACTION_NPC_MIN_COUNT)
  @Max(FACTION_NPC_MAX_COUNT)
  count: number;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Notes' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string | null;
}
