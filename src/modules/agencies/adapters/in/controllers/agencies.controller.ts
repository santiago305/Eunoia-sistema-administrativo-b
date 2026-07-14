import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { CreateAgencyUsecase } from "src/modules/agencies/application/usecases/agency/create.usecase";
import { ExportAgenciesExcelUsecase } from "src/modules/agencies/application/usecases/agency/export-excel.usecase";
import { GetAgencyUsecase } from "src/modules/agencies/application/usecases/agency/get-by-id.usecase";
import { GetAgencyWithSubsidiariesUsecase } from "src/modules/agencies/application/usecases/agency/get-with-subsidiaries.usecase";
import { ImportCreateAgencyUsecase } from "src/modules/agencies/application/usecases/agency/import-create.usecase";
import { ListAgenciesUsecase } from "src/modules/agencies/application/usecases/agency/list.usecase";
import { ListSubsidiariesUsecase } from "src/modules/agencies/application/usecases/agency/list-subsidiaries.usecase";
import { SetAgencyActiveUsecase } from "src/modules/agencies/application/usecases/agency/set-active.usecase";
import { UpdateAgencyUsecase } from "src/modules/agencies/application/usecases/agency/update.usecase";
import { GetAgencySearchStateUsecase } from "src/modules/agencies/application/usecases/agency-search/get-state.usecase";
import { SaveAgencySearchMetricUsecase } from "src/modules/agencies/application/usecases/agency-search/save-metric.usecase";
import { DeleteAgencySearchMetricUsecase } from "src/modules/agencies/application/usecases/agency-search/delete-metric.usecase";
import { sanitizeAgencySearchSnapshot } from "src/modules/agencies/application/support/agency-search.utils";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { HttpCreateAgencyDto } from "../dtos/http-agency-create.dto";
import { HttpAgencyImportCreateDto } from "../dtos/http-agency-import-create.dto";
import { HttpExportAgenciesDto } from "../dtos/http-export-agencies.dto";
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
    private readonly exportExcel: ExportAgenciesExcelUsecase,
    private readonly importCreateAgency: ImportCreateAgencyUsecase,
    private readonly listAgencies: ListAgenciesUsecase,
    private readonly listSubsidiariesUsecase: ListSubsidiariesUsecase,
    private readonly getAgency: GetAgencyUsecase,
    private readonly getAgencyWithSubsidiariesUsecase: GetAgencyWithSubsidiariesUsecase,
    private readonly updateAgency: UpdateAgencyUsecase,
    private readonly setAgencyActive: SetAgencyActiveUsecase,
    private readonly getSearchState: GetAgencySearchStateUsecase,
    private readonly saveSearchMetric: SaveAgencySearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteAgencySearchMetricUsecase,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly listingSearchStorage: ListingSearchStorageRepository,
  ) {}

  @RequirePermissions("agencies.manage")
  @Post()
  create(@Body() dto: HttpCreateAgencyDto) {
    return this.createAgency.execute({
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive,
      subsidiaries: dto.subsidiaries,
    });
  }

  @RequirePermissions("agencies.manage")
  @Post("import-create")
  importCreate(@Body() dto: HttpAgencyImportCreateDto) {
    return this.importCreateAgency.execute({ rows: dto.rows });
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
  @Get("export-columns")
  getExportColumns() {
    return this.exportExcel.getAvailableColumns();
  }

  @RequirePermissions("agencies.read")
  @Get("export-presets")
  async getExportPresets(@CurrentUser() user: { id: string }) {
    const state = await this.listingSearchStorage.listState({
      userId: user.id,
      tableKey: "agencies:export",
    });
    return state.metrics;
  }

  @RequirePermissions("agencies.read")
  @Post("export-presets")
  saveExportPreset(
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; columns: Array<{ key: string; label: string }> },
  ) {
    return this.listingSearchStorage.createMetric({
      userId: user.id,
      tableKey: "agencies:export",
      name: body.name,
      snapshot: {
        q: "",
        filters: [],
        ...(body as any),
      } as any,
    });
  }

  @RequirePermissions("agencies.read")
  @Delete("export-presets/:metricId")
  deleteExportPreset(
    @CurrentUser() user: { id: string },
    @Param("metricId", ParseUUIDPipe) metricId: string,
  ) {
    return this.listingSearchStorage.deleteMetric({
      userId: user.id,
      tableKey: "agencies:export",
      metricId,
    });
  }

  @RequirePermissions("agencies.export")
  @Post("export-excel")
  async exportAgenciesExcel(@Body() dto: HttpExportAgenciesDto, @Res() res: Response) {
    const file = await this.exportExcel.execute({
      columns: dto.columns,
      q: dto.q,
      filters: dto.filters,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return res.status(200).send(file.content);
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
      description: dto.description,
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
