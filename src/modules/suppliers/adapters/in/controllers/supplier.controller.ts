import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateSupplierUsecase } from "src/modules/suppliers/application/usecases/supplier/create.usecase";
import { UpdateSupplierUsecase } from "src/modules/suppliers/application/usecases/supplier/update.usecase";
import { SetSupplierActiveUsecase } from "src/modules/suppliers/application/usecases/supplier/set-active.usecase";
import { ListSuppliersUsecase } from "src/modules/suppliers/application/usecases/supplier/list.usecase";
import { GetSupplierUsecase } from "src/modules/suppliers/application/usecases/supplier/get-by-id.usecase";
import { DeleteSupplierSearchMetricUsecase } from "src/modules/suppliers/application/usecases/supplier-search/delete-metric.usecase";
import { GetSupplierSearchStateUsecase } from "src/modules/suppliers/application/usecases/supplier-search/get-state.usecase";
import { SaveSupplierSearchMetricUsecase } from "src/modules/suppliers/application/usecases/supplier-search/save-metric.usecase";
import { SupplierHttpMapper } from "src/modules/suppliers/application/mappers/supplier-http.mapper";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { HttpCreateSupplierDto } from "../dtos/supplier/http-supplier-create.dto";
import { HttpUpdateSupplierDto } from "../dtos/supplier/http-supplier-update.dto";
import { HttpSetSupplierActiveDto } from "../dtos/supplier/http-supplier-set-active.dto";
import { HttpCreateSupplierSearchMetricDto } from "../dtos/supplier/http-supplier-search-metric-create.dto";
import { ListSupplierQueryDto } from "../dtos/supplier/http-supplier-list.dto";
import { sanitizeSupplierSearchSnapshot } from "src/modules/suppliers/application/support/supplier-search.utils";

@Controller("suppliers")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class SuppliersController {
  constructor(
    private readonly createSupplier: CreateSupplierUsecase,
    private readonly updateSupplier: UpdateSupplierUsecase,
    private readonly setSupplierActive: SetSupplierActiveUsecase,
    private readonly listSuppliers: ListSuppliersUsecase,
    private readonly getSupplier: GetSupplierUsecase,
    private readonly getSearchState: GetSupplierSearchStateUsecase,
    private readonly saveSearchMetric: SaveSupplierSearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteSupplierSearchMetricUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateSupplierDto) {
    return this.createSupplier.execute(SupplierHttpMapper.toCreateSupplierInput(dto));
  }

  @Get()
  list(@Query() query: ListSupplierQueryDto, @CurrentUser() user: { id: string }) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";
    return this.listSuppliers.execute(SupplierHttpMapper.toListSuppliersInput({
      page: query.page,
      limit: query.limit,
      isActive,
      documentType: query.documentType,
      documentNumber: query.documentNumber,
      name: query.name,
      lastName: query.lastName,
      tradeName: query.tradeName,
      phone: query.phone,
      email: query.email,
      q: query.q,
      filters: query.filters,
      requestedBy: user?.id,
    }));
  }

  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @Post("search-metrics")
  saveMetric(
    @Body() dto: HttpCreateSupplierSearchMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeSupplierSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @Delete("search-metrics/:metricId")
  deleteMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getSupplier.execute({ supplierId: id });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateSupplierDto) {
    return this.updateSupplier.execute(SupplierHttpMapper.toUpdateSupplierInput(id, dto));
  }

  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetSupplierActiveDto) {
    return this.setSupplierActive.execute(SupplierHttpMapper.toSetActiveInput(id, dto.isActive));
  }
}
