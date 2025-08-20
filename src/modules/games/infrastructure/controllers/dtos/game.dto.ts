import { ApiProperty } from '@nestjs/swagger';
import { Game } from 'src/modules/games/domain/entities/game';
import { PaginationDto } from 'src/modules/shared/infrastructure/controller/dto';

export class GameDto {
  name: string;
  realm: string;
  description: string | undefined;

  static fromEntity(entity: Game): GameDto {
    return {
      ...entity,
    };
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
