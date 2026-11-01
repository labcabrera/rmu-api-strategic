import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Page } from '../../../shared/application/pagination/page.js';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import { PagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query.js';
import {
  CancelEnchantmentCommand,
  ChangeEnchantmentStatusCommand,
  CompleteEnchantmentCommand,
  DeleteEnchantmentCommand,
} from '../../application/cqrs/commands/enchantment.commands.js';
import type { EnchantmentCompletion } from '../../application/cqrs/handlers/complete-enchantment.handler.js';
import { GetEnchantmentQuery, GetEnchantmentsQuery } from '../../application/cqrs/queries/enchantment.queries.js';
import type { EnchantmentProject } from '../../domain/aggregates/enchantment-project.js';
import type { EnchantmentPlan } from '../../domain/services/enchantment-planner.js';
import {
  CreateEnchantmentDto,
  EnchantmentFailureRollsDto,
  EnchantmentRequestDto,
  ProgressEnchantmentDto,
  UpdateEnchantmentDto,
} from './dto/enchantment-request.dto.js';
import { EnchantmentCompletionDto, EnchantmentPlanDto, EnchantmentProjectDto, EnchantmentProjectPageDto } from './dto/enchantment.dto.js';

const ACTION_ERRORS = {
  400: 'Invalid data',
  403: 'Not allowed to manage the alchemist',
  404: 'Project not found (err-enchantment-not-found)',
  409: 'Wrong status for the action (err-enchantment-status, err-enchantment-failure-rolls-pending) or stale version',
} as const;

/** Enchantment projects of an alchemist (workspace spec 064). */
@UseGuards(JwtAuthGuard)
@Controller('v1/enchantments')
@ApiTags('Enchantments')
export class EnchantmentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('quote')
  @HttpCode(200)
  @ApiOperation({ operationId: 'quoteEnchantment', summary: 'Days, PP, item level, costs and SCR modifiers of an enchantment' })
  @ApiOkResponse({ type: EnchantmentPlanDto })
  @ApiErrors({
    400: 'Invalid data, unknown spell (err-enchantment-spell-unknown), no alchemical spell or invalid batch',
    403: 'Not allowed to manage the alchemist or the item',
    404: 'Alchemist or item not found',
    409: 'The item is enchanted or in another project',
  })
  async quote(@Body() dto: EnchantmentRequestDto, @CurrentUser() user: AuthenticatedUser): Promise<EnchantmentPlanDto> {
    const plan = await this.queryBus.execute<ReturnType<typeof EnchantmentRequestDto.toQuery>, EnchantmentPlan>(
      EnchantmentRequestDto.toQuery(dto, user.id, user.roles),
    );
    return EnchantmentPlanDto.of(plan);
  }

  @Post('')
  @ApiOperation({ operationId: 'createEnchantment', summary: 'Start an enchantment: SCR rolls and the materials paid' })
  @ApiCreatedResponse({ type: EnchantmentProjectDto })
  @ApiErrors({
    400: 'Invalid data, missing SCR roll (err-enchantment-scr-roll-required) or not enough gold (err-insufficient-gold)',
    403: 'Not allowed to manage the alchemist, the item or the payer',
    404: 'Alchemist or item not found',
    409: 'The item is enchanted (err-enchantment-item-enchanted) or in another project (err-enchantment-item-busy)',
  })
  async create(@Body() dto: CreateEnchantmentDto, @CurrentUser() user: AuthenticatedUser): Promise<EnchantmentProjectDto> {
    return this.project(CreateEnchantmentDto.toCommand(dto, user.id, user.roles));
  }

  @Get('')
  @ApiOperation({
    operationId: 'findEnchantments',
    summary: 'Enchantment projects by RSQL (gameId==, alchemistId==, itemId==, status==), newest first',
  })
  @ApiOkResponse({ type: EnchantmentProjectPageDto })
  @ApiErrors({ 400: 'Invalid RSQL query' })
  async find(@Query() dto: PagedQueryDto, @CurrentUser() user: AuthenticatedUser): Promise<Page<EnchantmentProjectDto>> {
    const page = await this.queryBus.execute<GetEnchantmentsQuery, Page<EnchantmentProject>>(
      new GetEnchantmentsQuery(dto.q, dto.page, dto.size, user.id, user.roles),
    );
    return new Page(
      page.content.map(project => EnchantmentProjectDto.fromEntity(project)),
      page.pagination.page,
      page.pagination.size,
      page.pagination.totalElements,
    );
  }

  @Get(':id')
  @ApiOperation({ operationId: 'findEnchantmentById', summary: 'An enchantment project' })
  @ApiOkResponse({ type: EnchantmentProjectDto })
  @ApiErrors({ 403: 'Not allowed', 404: 'Project not found (err-enchantment-not-found)' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<EnchantmentProjectDto> {
    const project = await this.queryBus.execute<GetEnchantmentQuery, EnchantmentProject>(new GetEnchantmentQuery(id, user.id, user.roles));
    return EnchantmentProjectDto.fromEntity(project);
  }

  @Post(':id/failure-rolls')
  @HttpCode(200)
  @ApiOperation({ operationId: 'sendEnchantmentFailureRolls', summary: 'Failure rolls of the failed SCRs, on the tables of core' })
  @ApiOkResponse({ type: EnchantmentProjectDto })
  @ApiErrors(ACTION_ERRORS)
  async failureRolls(
    @Param('id') id: string,
    @Body() dto: EnchantmentFailureRollsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EnchantmentProjectDto> {
    return this.project(EnchantmentFailureRollsDto.toCommand(id, dto, user.id, user.roles));
  }

  @Post(':id/progress')
  @HttpCode(200)
  @ApiOperation({ operationId: 'progressEnchantment', summary: 'Days worked (by hand: there is no game calendar)' })
  @ApiOkResponse({ type: EnchantmentProjectDto })
  @ApiErrors(ACTION_ERRORS)
  async progress(
    @Param('id') id: string,
    @Body() dto: ProgressEnchantmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EnchantmentProjectDto> {
    return this.project(ProgressEnchantmentDto.toCommand(id, dto, user.id, user.roles));
  }

  @Post(':id/suspend')
  @HttpCode(200)
  @ApiOperation({ operationId: 'suspendEnchantment', summary: 'Suspend a project in progress' })
  @ApiOkResponse({ type: EnchantmentProjectDto })
  @ApiErrors(ACTION_ERRORS)
  async suspend(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<EnchantmentProjectDto> {
    return this.project(new ChangeEnchantmentStatusCommand(id, 'suspend', user.id, user.roles));
  }

  @Post(':id/resume')
  @HttpCode(200)
  @ApiOperation({ operationId: 'resumeEnchantment', summary: 'Resume a suspended project' })
  @ApiOkResponse({ type: EnchantmentProjectDto })
  @ApiErrors(ACTION_ERRORS)
  async resume(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<EnchantmentProjectDto> {
    return this.project(new ChangeEnchantmentStatusCommand(id, 'resume', user.id, user.roles));
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateEnchantment', summary: 'Extra days, extra cost (charged to the payer) and notes' })
  @ApiOkResponse({ type: EnchantmentProjectDto })
  @ApiErrors({ ...ACTION_ERRORS, 400: 'Invalid data or not enough gold (err-insufficient-gold)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEnchantmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EnchantmentProjectDto> {
    return this.project(UpdateEnchantmentDto.toCommand(id, dto, user.id, user.roles));
  }

  @Post(':id/complete')
  @HttpCode(200)
  @ApiOperation({ operationId: 'completeEnchantment', summary: 'Every day worked: the item gets its enchantment' })
  @ApiOkResponse({ type: EnchantmentCompletionDto })
  @ApiErrors({ ...ACTION_ERRORS, 409: 'Days left (err-enchantment-not-finished), failure rolls pending or wrong status' })
  async complete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<EnchantmentCompletionDto> {
    const result = await this.commandBus.execute<CompleteEnchantmentCommand, EnchantmentCompletion>(
      new CompleteEnchantmentCommand(id, user.id, user.roles),
    );
    return EnchantmentCompletionDto.of(result);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ operationId: 'cancelEnchantment', summary: 'Cancel a project: the payer gets back the days not worked' })
  @ApiOkResponse({ type: EnchantmentProjectDto })
  @ApiErrors(ACTION_ERRORS)
  async cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<EnchantmentProjectDto> {
    return this.project(new CancelEnchantmentCommand(id, user.id, user.roles));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteEnchantment', summary: 'Delete a completed or cancelled project' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrors(ACTION_ERRORS)
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.commandBus.execute(new DeleteEnchantmentCommand(id, user.id, user.roles));
  }

  private async project(command: object): Promise<EnchantmentProjectDto> {
    return EnchantmentProjectDto.fromEntity(await this.commandBus.execute<object, EnchantmentProject>(command));
  }
}
