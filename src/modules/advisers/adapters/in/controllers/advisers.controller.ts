import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  RequireAnyPermissionGroups,
  RequirePermissions,
} from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { AccessControlService } from 'src/modules/access-control/application/services/access-control.service';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CompanyConfiguredGuard } from 'src/shared/utilidades/guards/company-configured.guard';
import { CreateAdviserUsecase } from '../../../application/usecases/create-adviser.usecase';
import { ListAdvisersUsecase } from '../../../application/usecases/list-advisers.usecase';
import { CreateAdviserDto } from '../dtos/create-adviser.dto';
import { ListAdviserSummaryUsecase } from '../../../application/usecases/list-adviser-summary.usecase';
import { SetAdviserActiveUsecase } from '../../../application/usecases/set-adviser-active.usecase';
import { UpdateAdviserUsecase } from '../../../application/usecases/update-adviser.usecase';
import { AdviserSearchService } from '../../../application/services/adviser-search.service';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { ListAdviserOrdersUsecase } from '../../../application/usecases/list-adviser-orders.usecase';
import { GetAdviserAnalyticsUsecase } from '../../../application/usecases/get-adviser-analytics.usecase';

@Controller('advisers')
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class AdvisersController {
  constructor(
    private readonly listAdvisers: ListAdvisersUsecase,
    private readonly createAdviser: CreateAdviserUsecase,
    private readonly summary: ListAdviserSummaryUsecase,
    private readonly adviserOrders: ListAdviserOrdersUsecase,
    private readonly adviserAnalytics: GetAdviserAnalyticsUsecase,
    private readonly setActive: SetAdviserActiveUsecase,
    private readonly updateAdviser: UpdateAdviserUsecase,
    private readonly search: AdviserSearchService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  @RequireAnyPermissionGroups([
    'advisers.view',
    'sale_orders.assign_adviser',
    'sale_orders.adviser_import_aliases.view',
    'sale_orders.adviser_import_aliases.manage',
  ])
  list() {
    return this.listAdvisers.execute();
  }

  @Get('candidates')
  @RequirePermissions('advisers.manage')
  listCandidates() {
    return this.listAdvisers.listCandidates();
  }

  @Get('summary')
  @RequirePermissions('advisers.view')
  async summaryList(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('q') q: string,
    @Query('filters') filters: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: { id: string },
  ) {
    const effectivePermissions =
      await this.accessControl.getEffectivePermissions(user.id);
    const permissions = new Set(effectivePermissions);
    const hasPermission = (permission: string) =>
      permissions.has('*') || permissions.has(permission);

    return this.summary.execute({
      page,
      limit,
      q,
      filters,
      startDate,
      endDate,
      requestedBy: user.id,
      includeOrderSummary: hasPermission('advisers.view_orders'),
      includePerformanceSummary: hasPermission('advisers.view_performance'),
    });
  }

  @Get(':userId/orders')
  @RequirePermissions('advisers.view', 'advisers.view_orders')
  adviserOrderList(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adviserOrders.execute({
      adviserUserId: userId,
      page,
      limit,
      startDate,
      endDate,
    });
  }

  @Get(':userId/analytics')
  @RequirePermissions('advisers.view', 'advisers.view_performance')
  analytics(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('months') months: number,
  ) {
    return this.adviserAnalytics.execute({ adviserUserId: userId, months });
  }

  @Get('search-state')
  @RequirePermissions('advisers.view')
  searchState(@CurrentUser() user: { id: string }) {
    return this.search.state(user.id);
  }

  @Post('search-metrics')
  @RequirePermissions('advisers.view')
  saveSearch(
    @Body() body: { name: string; snapshot: any },
    @CurrentUser() user: { id: string },
  ) {
    return this.search.save(user.id, body.name, body.snapshot);
  }

  @Delete('search-metrics/:metricId')
  @RequirePermissions('advisers.view')
  deleteSearch(
    @Param('metricId', ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.search.remove(user.id, metricId);
  }

  @Post()
  @RequirePermissions('advisers.manage')
  create(@Body() dto: CreateAdviserDto) {
    return this.createAdviser.execute({ userId: dto.userId });
  }

  @Patch(':userId/active')
  @RequirePermissions('advisers.manage')
  setAdviserActive(
    @Param('userId') userId: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.setActive.execute(userId, Boolean(isActive));
  }

  @Patch(':userId')
  @RequirePermissions('advisers.manage')
  update(
    @Param('userId') userId: string,
    @Body() body: { name?: string; email?: string },
  ) {
    return this.updateAdviser.execute(userId, body);
  }
}
