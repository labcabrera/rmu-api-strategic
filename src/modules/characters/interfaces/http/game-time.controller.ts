import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import type { PassTimeResult } from '../../application/cqrs/handlers/pass-time.handler.js';
import { PassTimeDto, PassTimeResultDto } from './dto/pass-time.dto.js';

/** The step of time of a campaign (workspace spec 065): it rests the characters, so it lives with them. */
@UseGuards(JwtAuthGuard)
@Controller('v1/strategic-games')
@ApiTags('Games')
export class GameTimeController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':id/pass-time')
  @HttpCode(200)
  @ApiBody({ type: PassTimeDto })
  @ApiOperation({ operationId: 'passTime', summary: 'Pass time in the campaign: the calendar and the rest of its characters' })
  @ApiOkResponse({ type: PassTimeResultDto })
  @ApiErrors({
    400: 'No time, too many days or a character not in the game',
    403: 'Not the owner of the game',
    404: 'Game not found',
    409: 'Stale version',
  })
  async passTime(@Param('id') id: string, @Body() dto: PassTimeDto, @CurrentUser() user: AuthenticatedUser): Promise<PassTimeResultDto> {
    const command = PassTimeDto.toCommand(id, dto, user.id, user.roles);
    return PassTimeResultDto.from(await this.commandBus.execute<typeof command, PassTimeResult>(command));
  }
}
