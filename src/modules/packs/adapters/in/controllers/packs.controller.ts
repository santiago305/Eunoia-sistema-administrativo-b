import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequireAnyPermissionGroups } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
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
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { XlsxBuilderService } from "src/shared/application/services/xlsx-builder.service";

const PACK_EXPORT_LABELS: Record<string, string> = {
  description: "Descripcion",
  total: "Total",
  isActive: "Activo",
  itemsCount: "Items",
  itemsPreview: "SKUs",
  createdAt: "Creado",
  updatedAt: "Actualizado",
};

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
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly listingSearchStorage: ListingSearchStorageRepository,
  ) {}

  @RequireAnyPermissionGroups(["packs.create", "packs.manage"])
  @Post()
  create(@Body() dto: HttpCreatePackDto) {
    return this.createPack.execute({
      description: dto.description,
      total: dto.total,
      isActive: dto.isActive,
      items: dto.items,
    });
  }

  @RequireAnyPermissionGroups(["packs.view", "packs.read"])
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

  @RequireAnyPermissionGroups(["packs.view", "packs.read"])
  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @RequireAnyPermissionGroups(["packs.view", "packs.read"])
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

  @RequireAnyPermissionGroups(["packs.view", "packs.read"])
  @Delete("search-metrics/:metricId")
  deleteMetric(@Param("metricId", ParseUUIDPipe) metricId: string, @CurrentUser() user: { id: string }) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @RequireAnyPermissionGroups(["packs.export", "packs.manage"])
  @Get("export-columns")
  async listExportColumns(@Query() query: ListPacksQueryDto, @CurrentUser() user: { id: string }) {
    const data = await this.list(query, user);
    const rows = this.toExportRows(data?.items);
    return this.buildExportColumnsFromFirstRow(rows[0] ?? {}, PACK_EXPORT_LABELS);
  }

  @RequireAnyPermissionGroups(["packs.export", "packs.manage"])
  @Get("export-presets")
  getExportPresets(@CurrentUser() user: { id: string }) {
    return this.listingSearchStorage.listState({
      userId: user.id,
      tableKey: "packs:export",
    }).then((state) => state.metrics);
  }

  @RequireAnyPermissionGroups(["packs.export", "packs.manage"])
  @Post("export-presets")
  saveExportPreset(
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; columns: Array<{ key: string; label: string }> },
  ) {
    return this.listingSearchStorage.createMetric({
      userId: user.id,
      tableKey: "packs:export",
      name: body.name,
      snapshot: { q: "", filters: [], ...(body as any) } as any,
    });
  }

  @RequireAnyPermissionGroups(["packs.export", "packs.manage"])
  @Delete("export-presets/:metricId")
  deleteExportPreset(
    @CurrentUser() user: { id: string },
    @Param("metricId", ParseUUIDPipe) metricId: string,
  ) {
    return this.listingSearchStorage.deleteMetric({
      userId: user.id,
      tableKey: "packs:export",
      metricId,
    });
  }

  @RequireAnyPermissionGroups(["packs.export", "packs.manage"])
  @Post("export-excel")
  async exportExcel(
    @Body() body: ListPacksQueryDto & { columns: Array<{ key: string; label: string }> },
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ) {
    const payload = await this.list(body, user);
    const rows = this.toExportRows(payload?.items);
    const columns = (body.columns?.length
      ? body.columns
      : this.buildExportColumnsFromFirstRow(rows[0] ?? {}, PACK_EXPORT_LABELS))
      .map((column) => ({ key: column.key, header: column.label }));
    const buffer = await new XlsxBuilderService().build({
      sheetName: "Packs",
      columns,
      rows,
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="packs-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    return res.status(200).send(buffer);
  }

  @RequireAnyPermissionGroups(["packs.view_detail", "packs.read"])
  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getPack.execute({ packId: id });
  }

  @RequireAnyPermissionGroups(["packs.update", "packs.delete", "packs.restore", "packs.manage"])
  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetPackActiveDto) {
    return this.setPackActive.execute({ packId: id, isActive: dto.isActive });
  }

  @RequireAnyPermissionGroups(["packs.update", "packs.manage"])
  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdatePackDto) {
    return this.updatePack.execute({
      packId: id,
      description: dto.description,
      total: dto.total,
      itemsReplace: dto.itemsReplace,
    });
  }

  private toExportRows(items: unknown): Record<string, unknown>[] {
    if (!Array.isArray(items)) return [];
    return items.map((entry: any) => {
      const pack = entry?.pack ?? entry;
      const packItems = entry?.items ?? [];
      return {
        description: pack?.description ?? "",
        total: pack?.total ?? 0,
        isActive: pack?.isActive ? "Activo" : "Inactivo",
        itemsCount: packItems.length,
        itemsPreview: packItems.map((item: any) => item?.sku?.name ?? item?.skuId).filter(Boolean).join(", "),
        createdAt: pack?.createdAt ?? "",
        updatedAt: pack?.updatedAt ?? "",
      };
    });
  }

  private buildExportColumnsFromFirstRow(row: Record<string, unknown>, labels: Record<string, string>) {
    return Object.keys(row).map((key) => ({
      key,
      label: labels[key] ?? key,
    }));
  }
}
