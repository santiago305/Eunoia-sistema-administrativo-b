import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateClientUsecase } from "src/modules/clients/application/usecases/client/create.usecase";
import { GetClientUsecase } from "src/modules/clients/application/usecases/client/get-by-id.usecase";
import { ListClientsUsecase } from "src/modules/clients/application/usecases/client/list.usecase";
import { SetClientActiveUsecase } from "src/modules/clients/application/usecases/client/set-active.usecase";
import { UpdateClientUsecase } from "src/modules/clients/application/usecases/client/update.usecase";
import { DeleteClientSearchMetricUsecase } from "src/modules/clients/application/usecases/client-search/delete-metric.usecase";
import { GetClientSearchStateUsecase } from "src/modules/clients/application/usecases/client-search/get-state.usecase";
import { SaveClientSearchMetricUsecase } from "src/modules/clients/application/usecases/client-search/save-metric.usecase";
import { HttpCreateClientDto } from "../dtos/client/http-client-create.dto";
import { HttpSetClientActiveDto } from "../dtos/client/http-client-set-active.dto";
import { HttpCreateClientSearchMetricDto } from "../dtos/client/http-client-search-metric-create.dto";
import { HttpUpdateClientDto } from "../dtos/client/http-client-update.dto";
import { ListClientsQueryDto } from "../dtos/client/http-client-list.query.dto";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { sanitizeClientSearchSnapshot } from "src/modules/clients/application/support/client-search.utils";

@Controller("clients")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class ClientsController {
  constructor(
    private readonly createClient: CreateClientUsecase,
    private readonly listClients: ListClientsUsecase,
    private readonly getClient: GetClientUsecase,
    private readonly updateClient: UpdateClientUsecase,
    private readonly setClientActive: SetClientActiveUsecase,
    private readonly getSearchState: GetClientSearchStateUsecase,
    private readonly saveSearchMetric: SaveClientSearchMetricUsecase,
    private readonly deleteSearchMetric: DeleteClientSearchMetricUsecase,
  ) {}

  @RequirePermissions("clients.manage")
  @Post()
  create(@Body() dto: HttpCreateClientDto) {
    return this.createClient.execute({
      type: dto.type,
      fullName: dto.fullName,
      docType: dto.docType,
      docNumber: dto.docNumber ?? "",
      reference: dto.reference,
      address: dto.address,
      departmentId: dto.departmentId,
      provinceId: dto.provinceId,
      districtId: dto.districtId,
      isActive: dto.isActive,
      telephonesReplace: dto.telephonesReplace,
    });
  }

  @RequirePermissions("clients.read")
  @Get()
  list(@Query() query: ListClientsQueryDto, @CurrentUser() user: { id: string }) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";

    return this.listClients.execute({
      q: query.q,
      isActive,
      page: query.page,
      limit: query.limit,
      filters: query.filters,
      requestedBy: user?.id,
    });
  }

  @RequirePermissions("clients.read")
  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState.execute(user.id);
  }

  @RequirePermissions("clients.read")
  @Post("search-metrics")
  saveMetric(@Body() dto: HttpCreateClientSearchMetricDto, @CurrentUser() user: { id: string }) {
    return this.saveSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeClientSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @RequirePermissions("clients.read")
  @Delete("search-metrics/:metricId")
  deleteMetric(@Param("metricId", ParseUUIDPipe) metricId: string, @CurrentUser() user: { id: string }) {
    return this.deleteSearchMetric.execute(user.id, metricId);
  }

  @RequirePermissions("clients.read")
  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getClient.execute({ clientId: id });
  }

  @RequirePermissions("clients.manage")
  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateClientDto) {
    return this.updateClient.execute({
      clientId: id,
      type: dto.type,
      fullName: dto.fullName,
      docType: dto.docType,
      docNumber: dto.docNumber,
      reference: dto.reference,
      address: dto.address,
      departmentId: dto.departmentId,
      provinceId: dto.provinceId,
      districtId: dto.districtId,
      telephonesReplace: dto.telephonesReplace,
    });
  }

  @RequirePermissions("clients.manage")
  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetClientActiveDto) {
    return this.setClientActive.execute({ clientId: id, isActive: dto.isActive });
  }
}
