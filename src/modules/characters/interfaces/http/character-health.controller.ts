import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/interfaces/http/dto/error-dto';
import { PagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query';
import { Page } from '../../../shared/domain/entities/page';
import { Character } from '../../domain/aggregates/character.aggregate';
import { HealingLogEntry } from '../../domain/value-objects/healing-log-entry.vo';
import { InjuryRecoveryResult } from '../../application/cqrs/handlers/roll-injury-recovery.handler';
import { RollInjuryRecoveryCommand } from '../../application/cqrs/commands/roll-injury-recovery.command';
import { RollPermanentInjuryCommand } from '../../application/cqrs/commands/roll-permanent-injury.command';
import { ResolveConditionCommand } from '../../application/cqrs/commands/resolve-condition.command';
import { GetHealingLogQuery } from '../../application/cqrs/queries/get-healing-log.query';
import { CharacterDto } from './dto/character.dto';
import { HealingLogEntryDto, HealingLogPageDto } from './dto/character-health.dto';
import { TacticalOutcomeDto } from './dto/tactical-outcome.dto';
import { AddInjuryDto } from './dto/add-injury.dto';
import { UpdateInjuryDto } from './dto/update-injury.dto';
import { TreatInjuryDto } from './dto/treat-injury.dto';
import { InjuryRollDto } from './dto/injury-roll.dto';
import { RestDto } from './dto/rest.dto';
import type { AuthenticatedRequest } from '../../../shared/interfaces/http/authenticated-request';

export class CharacterRecoveryDto extends CharacterDto {
  @ApiProperty({ description: 'Medium or severe injury with doubles: a permanent injury roll is required', required: false })
  permanentCheckRequired?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Character health')
@ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
@ApiForbiddenResponse({ description: 'Not allowed to change the health of the character', type: ErrorDto })
@ApiNotFoundResponse({ description: 'Character, injury or condition not found', type: ErrorDto })
@ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
export class CharacterHealthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post(':id/tactical-outcomes')
  @HttpCode(200)
  @ApiBody({ type: TacticalOutcomeDto })
  @ApiOperation({
    operationId: 'applyTacticalOutcome',
    summary: 'Apply the outcome of a tactical game to the character',
    description: 'Idempotent by tacticalGameId. Allowed to the service account, administrators and the game owner.',
  })
  @ApiOkResponse({ type: CharacterDto })
  async applyTacticalOutcome(
    @Param('id') id: string,
    @Body() dto: TacticalOutcomeDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CharacterDto> {
    const command = TacticalOutcomeDto.toCommand(id, dto, req.user.id, req.user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<typeof command, Character>(command));
  }

  @Post(':id/injuries')
  @HttpCode(200)
  @ApiBody({ type: AddInjuryDto })
  @ApiOperation({ operationId: 'addInjury', summary: 'Add a manual injury (game master)' })
  @ApiOkResponse({ type: CharacterDto })
  async addInjury(@Param('id') id: string, @Body() dto: AddInjuryDto, @Request() req: AuthenticatedRequest): Promise<CharacterDto> {
    const command = AddInjuryDto.toCommand(id, dto, req.user.id, req.user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<typeof command, Character>(command));
  }

  @Patch(':id/injuries/:injuryId')
  @ApiBody({ type: UpdateInjuryDto })
  @ApiOperation({ operationId: 'updateInjury', summary: 'Edit an injury (game master)' })
  @ApiOkResponse({ type: CharacterDto })
  async updateInjury(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: UpdateInjuryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CharacterDto> {
    const command = UpdateInjuryDto.toCommand(id, injuryId, dto, req.user.id, req.user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<typeof command, Character>(command));
  }

  @Post(':id/injuries/:injuryId/treatments')
  @HttpCode(200)
  @ApiBody({ type: TreatInjuryDto })
  @ApiOperation({ operationId: 'treatInjury', summary: 'Treat an injury with a healer of the game or an external one' })
  @ApiOkResponse({ type: CharacterDto })
  async treatInjury(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: TreatInjuryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CharacterDto> {
    const command = TreatInjuryDto.toCommand(id, injuryId, dto, req.user.id, req.user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<typeof command, Character>(command));
  }

  @Post(':id/injuries/:injuryId/recovery')
  @HttpCode(200)
  @ApiBody({ type: InjuryRollDto })
  @ApiOperation({ operationId: 'rollInjuryRecovery', summary: 'Recovery roll of an injury: sets its days to heal' })
  @ApiOkResponse({ type: CharacterRecoveryDto })
  async rollRecovery(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: InjuryRollDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CharacterRecoveryDto> {
    const command = new RollInjuryRecoveryCommand(id, injuryId, dto.roll, req.user.id, req.user.roles);
    const result = await this.commandBus.execute<RollInjuryRecoveryCommand, InjuryRecoveryResult>(command);
    const response: CharacterRecoveryDto = CharacterDto.fromEntity(result.character);
    if (result.permanentCheckRequired) response.permanentCheckRequired = true;
    return response;
  }

  @Post(':id/injuries/:injuryId/permanent')
  @HttpCode(200)
  @ApiBody({ type: InjuryRollDto })
  @ApiOperation({ operationId: 'rollPermanentInjury', summary: 'Permanent injury roll: sets the penalty that stays' })
  @ApiOkResponse({ type: CharacterDto })
  async rollPermanent(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: InjuryRollDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CharacterDto> {
    const command = new RollPermanentInjuryCommand(id, injuryId, dto.roll, req.user.id, req.user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<RollPermanentInjuryCommand, Character>(command));
  }

  @Post(':id/rest')
  @HttpCode(200)
  @ApiBody({ type: RestDto })
  @ApiOperation({ operationId: 'restCharacter', summary: 'Pass time resting: hits and injury recovery' })
  @ApiOkResponse({ type: CharacterDto })
  async rest(@Param('id') id: string, @Body() dto: RestDto, @Request() req: AuthenticatedRequest): Promise<CharacterDto> {
    const command = RestDto.toCommand(id, dto, req.user.id, req.user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<typeof command, Character>(command));
  }

  @Post(':id/conditions/:conditionId/resolve')
  @HttpCode(200)
  @ApiOperation({ operationId: 'resolveCondition', summary: 'Resolve a condition (game master)' })
  @ApiOkResponse({ type: CharacterDto })
  async resolveCondition(
    @Param('id') id: string,
    @Param('conditionId') conditionId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CharacterDto> {
    const command = new ResolveConditionCommand(id, conditionId, req.user.id, req.user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<ResolveConditionCommand, Character>(command));
  }

  @Get(':id/healing-log')
  @ApiOperation({ operationId: 'getHealingLog', summary: 'Healing log of the character, newest first' })
  @ApiOkResponse({ type: HealingLogPageDto })
  async getHealingLog(
    @Param('id') id: string,
    @Query() dto: PagedQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Page<HealingLogEntryDto>> {
    const query = new GetHealingLogQuery(id, dto.page, dto.size, req.user.id, req.user.roles);
    const page = await this.queryBus.execute<GetHealingLogQuery, Page<HealingLogEntry>>(query);
    const content = page.content.map(entry => HealingLogEntryDto.fromEntity(entry));
    return new Page<HealingLogEntryDto>(content, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }
}
