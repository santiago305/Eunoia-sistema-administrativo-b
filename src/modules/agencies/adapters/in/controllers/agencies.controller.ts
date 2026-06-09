import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { CreateAgencyUsecase } from "src/modules/agencies/application/usecases/agency/create.usecase";
import { GetAgencyUsecase } from "src/modules/agencies/application/usecases/agency/get-by-id.usecase";
import { GetAgencyWithSubsidiariesUsecase } from "src/modules/agencies/application/usecases/agency/get-with-subsidiaries.usecase";
import { ListAgenciesUsecase } from "src/modules/agencies/application/usecases/agency/list.usecase";
import { ListSubsidiariesUsecase } from "src/modules/agencies/application/usecases/agency/list-subsidiaries.usecase";
import { SetAgencyActiveUsecase } from "src/modules/agencies/application/usecases/agency/set-active.usecase";
import { UpdateAgencyUsecase } from "src/modules/agencies/application/usecases/agency/update.usecase";
import { GetAgencySearchStateUsecase } from "src/modules/agencies/application/usecases/agency-search/get-state.usecase";
import { SaveAgencySearchMetricUsecase } from "src/modules/agencies/application/usecases/agency-search/save-metric.usecase";
import { DeleteAgencySearchMetricUsecase } from "src/modules/agencies/application/usecases/agency-search/delete-metric.usecase";
import { sanitizeAgencySearchSnapshot } from "src/modules/agencies/application/support/agency-search.utils";
import { HttpCreateAgencyDto } from "../dtos/http-agency-create.dto";
import { HttpUpdateAgencyDto } from "../dtos/http-agency-update.dto";
import { HttpSetAgencyActiveDto } from "../dtos/http-agency-set-active.dto";
import { ListAgenciesQueryDto } from "../dtos/list-agencies.query.dto";
import { ListSubsidiariesQueryDto } from "../dtos/list-subsidiaries.query.dto";
import { HttpCreateAgencySearchMetricDto } from "../dtos/http-agency-search-metric-create.dto";

@Controller("agencies")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class AgenciesController {
  constructor(
    private readonly createAgency: CreateAgencyUsecase,
    private readonly listAgencies: ListAgenciesUsecase,
    private readonly listSubsidiariesUsecase: ListSubsidiariesUsecase,
    private readonly getAgency: GetAgencyUsecase,
    private readonly getAgencyWithSubsidiariesUsecase: GetAgencyWithSubsidiariesUsecase,
    private readonly updateAgency: UpdateAgencyUsecase,
    private readonly setAgencyActive: SetAgencyActiveUsecase,
    private readonly getSearchState: GetAgencySearchStateUsecase,
    private readonly saveSearchMetric: SaveAgencySearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteAgencySearchMetricUsecase,
  ) {}

  @RequirePermissions("agencies.manage")
  @Post()
  create(@Body() dto: HttpCreateAgencyDto) {
    return this.createAgency.execute({
      name: dto.name,
      isActive: dto.isActive,
      subsidiaries: dto.subsidiaries,
    });
  }

  @RequirePermissions("agencies.read")
  @Get()
  list(@Query() query: ListAgenciesQueryDto, @CurrentUser() user: { id: string }) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";

    return this.listAgencies.execute({
      q: query.q,
      isActive,
      page: query.page,
      limit: query.limit,
      filters: query.filters,
      requestedBy: user?.id,
    });
  }

  @RequirePermissions("agencies.read")
  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @RequirePermissions("agencies.read")
  @Post("search-metrics")
  saveMetric(@Body() dto: HttpCreateAgencySearchMetricDto, @CurrentUser() user: { id: string }) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeAgencySearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @RequirePermissions("agencies.read")
  @Delete("search-metrics/:metricId")
  deleteMetric(@Param("metricId", ParseUUIDPipe) metricId: string, @CurrentUser() user: { id: string }) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @RequirePermissions("agencies.read")
  @Get("subsidiaries")
  listSubsidiaries(@Query() query: ListSubsidiariesQueryDto) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";
    return this.listSubsidiariesUsecase.execute({
      q: query.q,
      agencyId: query.agencyId,
      isActive,
    });
  }

  @RequirePermissions("agencies.read")
  @Get(":id/with-subsidiaries")
  getAgencyWithSubsidiaries(@Param("id", ParseUUIDPipe) id: string) {
    return this.getAgencyWithSubsidiariesUsecase.execute({ agencyId: id });
  }

  @RequirePermissions("agencies.read")
  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getAgency.execute({ agencyId: id });
  }

  @RequirePermissions("agencies.manage")
  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateAgencyDto) {
    return this.updateAgency.execute({
      agencyId: id,
      name: dto.name,
      isActive: dto.isActive,
      subsidiaries: dto.subsidiaries,
    });
  }

  @RequirePermissions("agencies.manage")
  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetAgencyActiveDto) {
    return this.setAgencyActive.execute({ agencyId: id, isActive: dto.isActive });
  }
}
