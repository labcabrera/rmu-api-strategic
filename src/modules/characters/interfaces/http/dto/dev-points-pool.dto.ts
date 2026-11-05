import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { DEV_POINTS_POOL_CHOICES, type DevPointsPoolChoice } from '../../../domain/services/dev-points/dev-points-spending.service.js';

export const DEV_POINTS_POOL_DESCRIPTION =
  "Pool that pays the development points (workspace spec 076): 'auto' (normal points first, then bonus points), " +
  "'bonus' (bonus points first, up to the per level limit, then normal points) or 'normal' (only normal points)";

/** Query of the operations without a body that cost development points: the pool to pay with. */
export class DevPointsPoolQueryDto {
  @ApiPropertyOptional({ enum: DEV_POINTS_POOL_CHOICES, default: 'auto', description: DEV_POINTS_POOL_DESCRIPTION })
  @IsOptional()
  @IsIn(DEV_POINTS_POOL_CHOICES)
  pool?: DevPointsPoolChoice;
}
