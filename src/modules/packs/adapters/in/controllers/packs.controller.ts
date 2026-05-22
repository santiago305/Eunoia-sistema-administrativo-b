import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreatePackUsecase } from "src/modules/packs/application/usecases/pack/create.usecase";
import { ListPacksUsecase } from "src/modules/packs/application/usecases/pack/list.usecase";
import { GetPackUsecase } from "src/modules/packs/application/usecases/pack/get-by-id.usecase";
import { SetPackActiveUsecase } from "src/modules/packs/application/usecases/pack/set-active.usecase";
import { UpdatePackUsecase } from "src/modules/packs/application/usecases/pack/update.usecase";
import { ListPacksQueryDto } from "../dtos/list-packs.query.dto";
import { HttpCreatePackDto } from "../dtos/http-pack-create.dto";
import { HttpSetPackActiveDto } from "../dtos/http-pack-set-active.dto";
import { HttpUpdatePackDto } from "../dtos/http-pack-update.dto";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { GetPackSearchStateUsecase } from "src/modules/packs/application/usecases/pack-search/get-state.usecase";
import { SavePackSearchMetricUsecase } from "src/modules/packs/application/usecases/pack-search/save-metric.usecase";
import { DeletePackSearchMetricUsecase } from "src/modules/packs/application/usecases/pack-search/delete-metric.usecase";
import { HttpCreatePackSearchMetricDto } from "../dtos/http-pack-search-metric-create.dto";
import { sanitizePackSearchSnapshot } from "src/modules/packs/application/support/pack-search.utils";

@Controller("packs")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class PacksController {
  constructor(
    private readonly createPack: CreatePackUsecase,
    private readonly listPacks: ListPacksUsecase,
    private readonly getPack: GetPackUsecase,
    private readonly setPackActive: SetPackActiveUsecase,
    private readonly updatePack: UpdatePackUsecase,
    private readonly getSearchState: GetPackSearchStateUsecase,
    private readonly saveSearchMetric: SavePackSearchMetricUsecase,
    private readonly deleteSearchMetric: DeletePackSearchMetricUsecase,
  ) {}

  @RequirePermissions("packs.manage")
  @Post()
  create(@Body() dto: HttpCreatePackDto) {
    return this.createPack.execute({
      description: dto.description,
      total: dto.total,
      isActive: dto.isActive,
      items: dto.items,
    });
  }

  @RequirePermissions("packs.read")
  @Get()
  list(@Query() query: ListPacksQueryDto, @CurrentUser() user: { id: string }) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";
    return this.listPacks.execute({
      q: query.q,
      isActive,
      page: query.page,
      limit: query.limit,
      filters: query.filters,
      requestedBy: user?.id,
    });
  }

  @RequirePermissions("packs.read")
  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @RequirePermissions("packs.read")
  @Post("search-metrics")
  saveMetric(@Body() dto: HttpCreatePackSearchMetricDto, @CurrentUser() user: { id: string }) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizePackSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @RequirePermissions("packs.read")
  @Delete("search-metrics/:metricId")
  deleteMetric(@Param("metricId", ParseUUIDPipe) metricId: string, @CurrentUser() user: { id: string }) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @RequirePermissions("packs.read")
  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getPack.execute({ packId: id });
  }

  @RequirePermissions("packs.manage")
  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetPackActiveDto) {
    return this.setPackActive.execute({ packId: id, isActive: dto.isActive });
  }

  @RequirePermissions("packs.manage")
  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdatePackDto) {
    return this.updatePack.execute({
      packId: id,
      description: dto.description,
      total: dto.total,
      itemsReplace: dto.itemsReplace,
    });
  }
}
