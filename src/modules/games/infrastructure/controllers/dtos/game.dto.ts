import { ApiProperty } from '@nestjs/swagger';
import { Game, GameStatus } from 'src/modules/games/domain/entities/game';
import { PaginationDto } from 'src/modules/shared/infrastructure/controller/dto';

export class GameDto {
  id: string;
  name: string;
  realm: string;
  status: GameStatus;
  description: string | undefined;

  static fromEntity(entity: Game): GameDto {
    const dto = new GameDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.realm = entity.realm;
    dto.status = entity.status;
    dto.description = entity.description;
    return dto;
  }
}

export class GamePageDto {
  @ApiProperty({
    type: [GameDto],
    description: 'Games',
    isArray: true,
  })
  content: GameDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
