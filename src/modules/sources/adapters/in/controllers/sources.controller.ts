import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { CreateSourceUsecase } from "src/modules/sources/application/usecases/source/create.usecase";
import { GetSourceUsecase } from "src/modules/sources/application/usecases/source/get-by-id.usecase";
import { ListSourcesUsecase } from "src/modules/sources/application/usecases/source/list.usecase";
import { SetSourceActiveUsecase } from "src/modules/sources/application/usecases/source/set-active.usecase";
import { UpdateSourceUsecase } from "src/modules/sources/application/usecases/source/update.usecase";
import { GetSourceSearchStateUsecase } from "src/modules/sources/application/usecases/source-search/get-state.usecase";
import { SaveSourceSearchMetricUsecase } from "src/modules/sources/application/usecases/source-search/save-metric.usecase";
import { DeleteSourceSearchMetricUsecase } from "src/modules/sources/application/usecases/source-search/delete-metric.usecase";
import { sanitizeSourceSearchSnapshot } from "src/modules/sources/application/support/source-search.utils";
import { HttpCreateSourceDto } from "../dtos/http-source-create.dto";
import { HttpUpdateSourceDto } from "../dtos/http-source-update.dto";
import { HttpSetSourceActiveDto } from "../dtos/http-source-set-active.dto";
import { ListSourcesQueryDto } from "../dtos/list-sources.query.dto";
import { HttpCreateSourceSearchMetricDto } from "../dtos/http-source-search-metric-create.dto";

@Controller("sources")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class SourcesController {
  constructor(
    private readonly createSource: CreateSourceUsecase,
    private readonly listSources: ListSourcesUsecase,
    private readonly getSource: GetSourceUsecase,
    private readonly updateSource: UpdateSourceUsecase,
    private readonly setSourceActive: SetSourceActiveUsecase,
    private readonly getSearchState: GetSourceSearchStateUsecase,
    private readonly saveSearchMetric: SaveSourceSearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteSourceSearchMetricUsecase,
  ) {}

  @RequirePermissions("sources.manage")
  @Post()
  create(@Body() dto: HttpCreateSourceDto) {
    return this.createSource.execute({
      name: dto.name,
      detail: dto.detail,
      isActive: dto.isActive,
    });
  }

  @RequirePermissions("sources.read")
  @Get()
  list(@Query() query: ListSourcesQueryDto, @CurrentUser() user: { id: string }) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";

    return this.listSources.execute({
      q: query.q,
      isActive,
      page: query.page,
      limit: query.limit,
      filters: query.filters,
      requestedBy: user?.id,
    });
  }

  @RequirePermissions("sources.read")
  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @RequirePermissions("sources.read")
  @Post("search-metrics")
  saveMetric(@Body() dto: HttpCreateSourceSearchMetricDto, @CurrentUser() user: { id: string }) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeSourceSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @RequirePermissions("sources.read")
  @Delete("search-metrics/:metricId")
  deleteMetric(@Param("metricId", ParseUUIDPipe) metricId: string, @CurrentUser() user: { id: string }) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @RequirePermissions("sources.read")
  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getSource.execute({ sourceId: id });
  }

  @RequirePermissions("sources.manage")
  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateSourceDto) {
    return this.updateSource.execute({
      sourceId: id,
      name: dto.name,
      detail: dto.detail,
    });
  }

  @RequirePermissions("sources.manage")
  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetSourceActiveDto) {
    return this.setSourceActive.execute({ sourceId: id, isActive: dto.isActive });
  }
}

