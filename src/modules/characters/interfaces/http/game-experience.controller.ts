import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import type { GroupXpResult } from '../../application/cqrs/handlers/award-group-xp.handler.js';
import { GroupXpDto, GroupXpResultDto } from './dto/group-xp.dto.js';

/** Experience for the group of a campaign (workspace spec 079, E): it changes the characters, so it lives with them. */
@UseGuards(JwtAuthGuard)
@Controller('v1/strategic-games')
@ApiTags('Games')
export class GameExperienceController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':id/xp')
  @HttpCode(200)
  @ApiBody({ type: GroupXpDto })
  @ApiOperation({
    operationId: 'awardGroupXp',
    summary: 'Give experience to the characters of the game: the whole amount to each one (all of them by default)',
  })
  @ApiOkResponse({ type: GroupXpResultDto })
  @ApiErrors({
    400: 'Invalid experience, a character not in the game or no characters',
    403: 'Not a master of the game',
    404: 'Game not found',
  })
  async awardXp(@Param('id') id: string, @Body() dto: GroupXpDto, @CurrentUser() user: AuthenticatedUser): Promise<GroupXpResultDto> {
    const command = GroupXpDto.toCommand(id, dto, user.id, user.roles);
    return GroupXpResultDto.from(await this.commandBus.execute<typeof command, GroupXpResult>(command));
  }
}
