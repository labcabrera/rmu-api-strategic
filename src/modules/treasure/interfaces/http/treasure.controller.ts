import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Item } from '../../../items/domain/aggregates/item.js';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { TreasureRoll } from '../../domain/services/treasure-generator.js';
import { TreasureAwardDto, TreasureAwardResultDto, TreasureRollRequestDto } from './dto/treasure.dto.js';

/** Random treasure of Treasure Law 7.1 (workspace spec 067). */
@UseGuards(JwtAuthGuard)
@Controller('v1/treasure')
@ApiTags('Treasure')
export class TreasureController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('rolls')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'rollTreasure',
    summary: 'Work out a random treasure from its codes or qualities and the dice rolled by the client; nothing is stored',
  })
  @ApiOkResponse({ description: 'Codes, lines with their dice and warnings, or the next die to roll in `pending`' })
  @ApiErrors({ 400: 'Invalid data, a die out of range, dice left over or no treasure tables in core' })
  async roll(@Body() dto: TreasureRollRequestDto, @CurrentUser() user: AuthenticatedUser): Promise<TreasureRoll> {
    return this.queryBus.execute<object, TreasureRoll>(TreasureRollRequestDto.toQuery(dto, user.id, user.roles));
  }

  @Post('awards')
  @ApiOperation({ operationId: 'awardTreasure', summary: 'Give the chosen lines of a treasure to a faction or character' })
  @ApiCreatedResponse({ type: TreasureAwardResultDto })
  @ApiErrors({ 400: 'Invalid data', 403: 'Not allowed', 404: 'Holder not found' })
  async award(@Body() dto: TreasureAwardDto, @CurrentUser() user: AuthenticatedUser): Promise<TreasureAwardResultDto> {
    const result = await this.commandBus.execute<object, { items: Item[]; gold: number }>(
      TreasureAwardDto.toCommand(dto, user.id, user.roles),
    );
    return TreasureAwardResultDto.of(result);
  }
}
