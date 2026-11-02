import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { toStrictBoolean } from '../../../../shared/interfaces/http/dto/strict-boolean.js';

/**
 * The route of the carried status (spec 044). A `boolean` @Param would be turned into `false` for any text but
 * `true` by the global ValidationPipe, before any other pipe sees it; here only `true` and `false` are accepted.
 */
export class CarriedStatusParamsDto {
  @ApiProperty({ description: 'Character identifier' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Item identifier' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Whether the character carries the item', enum: ['true', 'false'] })
  @Transform(toStrictBoolean)
  @IsBoolean()
  carried: boolean;
}
