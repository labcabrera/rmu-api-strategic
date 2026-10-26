import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { Character } from '../../domain/aggregates/character.js';
import { ChangePowerCommand, type PowerChange } from '../../application/cqrs/commands/change-power.command.js';
import { GetCharacterSpellsQuery } from '../../application/cqrs/queries/get-character-spells.query.js';
import type { KnownSpellList } from '../../application/cqrs/handlers/get-character-spells.handler.js';
import { CharacterDto } from './dto/character.dto.js';
import { KnownSpellListDto, PowerAmountDto } from './dto/character-magic.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Character magic')
@ApiErrors({
  403: 'Not allowed to read or change the character',
  404: 'Character not found',
  400: 'Bad request, invalid data or not enough power points',
})
export class CharacterMagicController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get(':id/spells')
  @ApiOperation({ operationId: 'findCharacterSpells', summary: 'Spell lists of the character and the spells it knows (up to its ranks)' })
  @ApiOkResponse({ type: [KnownSpellListDto] })
  async findSpells(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<KnownSpellListDto[]> {
    const query = new GetCharacterSpellsQuery(id, user.id, user.roles);
    const lists = await this.queryBus.execute<GetCharacterSpellsQuery, KnownSpellList[]>(query);
    return lists.map(list => KnownSpellListDto.fromEntity(list));
  }

  @Post(':id/power/spend')
  @HttpCode(200)
  @ApiBody({ type: PowerAmountDto })
  @ApiOperation({ operationId: 'spendPower', summary: 'Spend power points: not enough points is a 400 err-insufficient-power' })
  @ApiOkResponse({ type: CharacterDto })
  async spendPower(@Param('id') id: string, @Body() dto: PowerAmountDto, @CurrentUser() user: AuthenticatedUser): Promise<CharacterDto> {
    return this.changePower(id, 'spend', dto, user);
  }

  @Post(':id/power/restore')
  @HttpCode(200)
  @ApiBody({ type: PowerAmountDto })
  @ApiOperation({ operationId: 'restorePower', summary: 'Give back power points, up to the maximum' })
  @ApiOkResponse({ type: CharacterDto })
  async restorePower(@Param('id') id: string, @Body() dto: PowerAmountDto, @CurrentUser() user: AuthenticatedUser): Promise<CharacterDto> {
    return this.changePower(id, 'restore', dto, user);
  }

  private async changePower(id: string, change: PowerChange, dto: PowerAmountDto, user: AuthenticatedUser): Promise<CharacterDto> {
    const command = new ChangePowerCommand(id, change, dto.amount, user.id, user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<ChangePowerCommand, Character>(command));
  }
}
