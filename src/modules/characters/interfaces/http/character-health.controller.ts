import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { PagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { Character } from '../../domain/aggregates/character.js';
import type { HealingLogEntry } from '../../domain/value-objects/healing-log-entry.vo.js';
import type { InjuryRecoveryResult } from '../../application/cqrs/handlers/roll-injury-recovery.handler.js';
import { RollInjuryRecoveryCommand } from '../../application/cqrs/commands/roll-injury-recovery.command.js';
import { RollPermanentInjuryCommand } from '../../application/cqrs/commands/roll-permanent-injury.command.js';
import { ResolveConditionCommand } from '../../application/cqrs/commands/resolve-condition.command.js';
import { RemoveTemporaryModifierCommand } from '../../application/cqrs/commands/remove-temporary-modifier.command.js';
import { GetHealingLogQuery } from '../../application/cqrs/queries/get-healing-log.query.js';
import { CharacterDto } from './dto/character.dto.js';
import { HealingLogEntryDto, HealingLogPageDto } from './dto/character-health.dto.js';
import { TacticalOutcomeDto } from './dto/tactical-outcome.dto.js';
import { AddInjuryDto } from './dto/add-injury.dto.js';
import { UpdateInjuryDto } from './dto/update-injury.dto.js';
import { TreatInjuryDto, TreatmentDifficultyDto, TreatmentDifficultyQueryDto } from './dto/treat-injury.dto.js';
import { GetTreatmentDifficultyQuery } from '../../application/cqrs/queries/get-treatment-difficulty.query.js';
import type { TreatmentDifficulty } from '../../domain/services/healing/injury-treatment-rules.js';
import { InjuryRollDto } from './dto/injury-roll.dto.js';
import { RestDto } from './dto/rest.dto.js';
import { AmputateLimbDto, AmputationResultDto, StrenuousFailureDto } from './dto/health-079.dto.js';
import type { AmputationResult } from '../../application/cqrs/handlers/health-079.handlers.js';
import { AntidoteResultDto, GiveAntidoteDto, PoisonCharacterDto, PoisonCharacterResultDto } from './dto/poisoning.dto.js';
import type { GiveAntidoteResult, PoisonCharacterResult } from '../../application/cqrs/handlers/poisoning.handlers.js';
import { HerbSearchResultDto, SearchHerbsDto, UseHerbDto, UseHerbResultDto } from './dto/herb.dto.js';
import type { HerbSearchOutcome, UseHerbResult } from '../../application/cqrs/handlers/herb.handlers.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';

export class CharacterRecoveryDto extends CharacterDto {
  @ApiProperty({
    description: 'Untreated injury, or medium or severe with doubles: a permanent injury roll is required',
    required: false,
  })
  permanentCheckRequired?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Character health')
@ApiErrors({
  403: 'Not allowed to change the health of the character',
  404: 'Character, injury or condition not found',
  400: 'Bad request, invalid data',
  409: 'Recovery already rolled for the latest treatment, or the character changed meanwhile',
})
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CharacterDto> {
    const command = TacticalOutcomeDto.toCommand(id, dto, user.id, user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<typeof command, Character>(command));
  }

  @Post(':id/injuries')
  @HttpCode(200)
  @ApiBody({ type: AddInjuryDto })
  @ApiOperation({ operationId: 'addInjury', summary: 'Add a manual injury (game master)' })
  @ApiOkResponse({ type: CharacterDto })
  async addInjury(@Param('id') id: string, @Body() dto: AddInjuryDto, @CurrentUser() user: AuthenticatedUser): Promise<CharacterDto> {
    const command = AddInjuryDto.toCommand(id, dto, user.id, user.roles);
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CharacterDto> {
    const command = UpdateInjuryDto.toCommand(id, injuryId, dto, user.id, user.roles);
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CharacterDto> {
    const command = TreatInjuryDto.toCommand(id, injuryId, dto, user.id, user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<typeof command, Character>(command));
  }

  @Get(':id/injuries/:injuryId/treatment-difficulty')
  @ApiOperation({
    operationId: 'getTreatmentDifficulty',
    summary: 'Difficulty the server uses for a procedure on the injury (core table, head and bleeding)',
  })
  @ApiOkResponse({ type: TreatmentDifficultyDto })
  async getTreatmentDifficulty(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Query() dto: TreatmentDifficultyQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TreatmentDifficultyDto> {
    const query = new GetTreatmentDifficultyQuery(id, injuryId, dto.procedure, user.id, user.roles);
    return TreatmentDifficultyDto.fromResult(await this.queryBus.execute<GetTreatmentDifficultyQuery, TreatmentDifficulty>(query));
  }

  @Post(':id/injuries/:injuryId/recovery')
  @HttpCode(200)
  @ApiBody({ type: InjuryRollDto })
  @ApiOperation({
    operationId: 'rollInjuryRecovery',
    summary: 'Recovery roll of an injury: sets its days to heal',
    description: 'One roll per treatment: a second roll without a new treatment answers 409 err-injury-recovery-rolled.',
  })
  @ApiOkResponse({ type: CharacterRecoveryDto })
  async rollRecovery(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: InjuryRollDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CharacterRecoveryDto> {
    const command = new RollInjuryRecoveryCommand(id, injuryId, dto.roll, user.id, user.roles);
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CharacterDto> {
    const command = new RollPermanentInjuryCommand(id, injuryId, dto.roll, user.id, user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<RollPermanentInjuryCommand, Character>(command));
  }

  @Post(':id/rest')
  @HttpCode(200)
  @ApiBody({ type: RestDto })
  @ApiOperation({ operationId: 'restCharacter', summary: 'Pass time resting: hits, power points and injury recovery' })
  @ApiOkResponse({ type: CharacterDto })
  async rest(@Param('id') id: string, @Body() dto: RestDto, @CurrentUser() user: AuthenticatedUser): Promise<CharacterDto> {
    const command = RestDto.toCommand(id, dto, user.id, user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<typeof command, Character>(command));
  }

  @Post(':id/amputations')
  @HttpCode(200)
  @ApiBody({ type: AmputateLimbDto })
  @ApiOperation({
    operationId: 'amputateLimb',
    summary: 'Amputate an arm or a leg with a Medicine roll (spec 079): surgical (-50) or emergency (-30)',
    description:
      'The limb is lost whatever the result and the stump heals as -40 bone, muscle and skin injuries (plus a burn when ' +
      'cauterized). A failure answers the critical the game master rolls (S, D, one result lower); an absolute failure, ' +
      'system shock. 409 err-limb-already-lost.',
  })
  @ApiOkResponse({ type: AmputationResultDto })
  async amputate(@Param('id') id: string, @Body() dto: AmputateLimbDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AmputateLimbDto.toCommand(id, dto, user.id, user.roles);
    return AmputationResultDto.from(await this.commandBus.execute<typeof command, AmputationResult>(command));
  }

  @Post(':id/injuries/:injuryId/strenuous-failure')
  @HttpCode(200)
  @ApiBody({ type: StrenuousFailureDto })
  @ApiOperation({
    operationId: 'injuryStrenuousFailure',
    summary: 'A strenuous activity failed while the injury recovered (spec 079): it is active again and needs a new treatment',
    description: 'An absolute failure doubles the penalty left. 400 err-injury-not-treated when no successful treatment.',
  })
  @ApiOkResponse({ type: CharacterDto })
  async strenuousFailure(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: StrenuousFailureDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CharacterDto> {
    const command = StrenuousFailureDto.toCommand(id, injuryId, dto, user.id, user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<typeof command, Character>(command));
  }

  @Post(':id/poisonings')
  @HttpCode(200)
  @ApiBody({ type: PoisonCharacterDto })
  @ApiOperation({ operationId: 'poisonCharacter', summary: 'Poison RR of an exposure; a failure poisons the character (spec 042)' })
  @ApiOkResponse({ type: PoisonCharacterResultDto })
  async poison(@Param('id') id: string, @Body() dto: PoisonCharacterDto, @CurrentUser() user: AuthenticatedUser) {
    const command = PoisonCharacterDto.toCommand(id, dto, user.id, user.roles);
    return PoisonCharacterResultDto.from(await this.commandBus.execute<typeof command, PoisonCharacterResult>(command));
  }

  @Post(':id/injuries/:injuryId/antidote')
  @HttpCode(200)
  @ApiBody({ type: GiveAntidoteDto })
  @ApiOperation({ operationId: 'giveAntidote', summary: 'Give an antidote for a poisoning (spec 042)' })
  @ApiOkResponse({ type: AntidoteResultDto })
  async antidote(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: GiveAntidoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = GiveAntidoteDto.toCommand(id, injuryId, dto, user.id, user.roles);
    return AntidoteResultDto.from(await this.commandBus.execute<typeof command, GiveAntidoteResult>(command));
  }

  @Post(':id/herb-uses')
  @HttpCode(200)
  @ApiBody({ type: UseHerbDto })
  @ApiOperation({
    operationId: 'useHerb',
    summary: 'Use a dose of a healing herb of the character (spec 062)',
    description:
      'Heals the roll (or a roll in the range of the herb) up to the maximum hits and spends one dose. ' +
      'A herb without a heal effect is 400 herb-without-effect (stun relief is tactical only).',
  })
  @ApiOkResponse({ type: UseHerbResultDto })
  async useHerb(@Param('id') id: string, @Body() dto: UseHerbDto, @CurrentUser() user: AuthenticatedUser): Promise<UseHerbResultDto> {
    const command = UseHerbDto.toCommand(id, dto, user.id, user.roles);
    return UseHerbResultDto.from(await this.commandBus.execute<typeof command, UseHerbResult>(command));
  }

  @Post(':id/herb-searches')
  @HttpCode(200)
  @ApiBody({ type: SearchHerbsDto })
  @ApiOperation({
    operationId: 'searchHerbs',
    summary: 'Search for herbs (Treasure Law 2.3, spec 062): the doses found go to the character',
    description:
      'An absolute maneuver per herb with its Find difficulty, -10 per previous search and the several herbs ' +
      'penalty. A herb that does not grow in the biome is not-here. Doses: 1d10 + 1 per full 10 over 100.',
  })
  @ApiOkResponse({ type: HerbSearchResultDto })
  async searchHerbs(
    @Param('id') id: string,
    @Body() dto: SearchHerbsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HerbSearchResultDto> {
    const command = SearchHerbsDto.toCommand(id, dto, user.id, user.roles);
    return HerbSearchResultDto.from(await this.commandBus.execute<typeof command, HerbSearchOutcome>(command));
  }

  @Post(':id/conditions/:conditionId/resolve')
  @HttpCode(200)
  @ApiOperation({ operationId: 'resolveCondition', summary: 'Resolve a condition (game master)' })
  @ApiOkResponse({ type: CharacterDto })
  async resolveCondition(
    @Param('id') id: string,
    @Param('conditionId') conditionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CharacterDto> {
    const command = new ResolveConditionCommand(id, conditionId, user.id, user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<ResolveConditionCommand, Character>(command));
  }

  @Delete(':id/temporary-modifiers/:modifierId')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'removeTemporaryModifier',
    summary: 'Remove a temporary morale or fear modifier (game master, workspace spec 068)',
  })
  @ApiOkResponse({ type: CharacterDto })
  async removeTemporaryModifier(
    @Param('id') id: string,
    @Param('modifierId') modifierId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CharacterDto> {
    const command = new RemoveTemporaryModifierCommand(id, modifierId, user.id, user.roles);
    return CharacterDto.fromEntity(await this.commandBus.execute<RemoveTemporaryModifierCommand, Character>(command));
  }

  @Get(':id/healing-log')
  @ApiOperation({ operationId: 'getHealingLog', summary: 'Healing log of the character, newest first' })
  @ApiOkResponse({ type: HealingLogPageDto })
  async getHealingLog(
    @Param('id') id: string,
    @Query() dto: PagedQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Page<HealingLogEntryDto>> {
    const query = new GetHealingLogQuery(id, dto.page, dto.size, user.id, user.roles);
    const page = await this.queryBus.execute<GetHealingLogQuery, Page<HealingLogEntry>>(query);
    const content = page.content.map(entry => HealingLogEntryDto.fromEntity(entry));
    return new Page<HealingLogEntryDto>(content, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }
}
