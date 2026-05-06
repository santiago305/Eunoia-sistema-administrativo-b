import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateSupplierMethodUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/create.usecase";
import { DeleteSupplierMethodUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/delete.usecase";
import { GetSupplierMethodByIdUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/get-by-id.usecase";
import { ListSupplierMethodsUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/list.usecase";
import { UpdateSupplierMethodUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/update.usecase";
import { HttpSupplierMethodCreateDto } from "../dtos/supplier-method/http-supplier-method-create.dto";
import { HttpSupplierMethodUpdateDto } from "../dtos/supplier-method/http-supplier-method-update.dto";
import { PaymentMethodHttpMapper } from "src/modules/payment-methods/application/mappers/payment-method-http.mapper";

@Controller("supplier-methods")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class SupplierMethodsController {
  constructor(
    private readonly createSupplierMethod: CreateSupplierMethodUsecase,
    private readonly listSupplierMethods: ListSupplierMethodsUsecase,
    private readonly updateSupplierMethod: UpdateSupplierMethodUsecase,
    private readonly deleteSupplierMethod: DeleteSupplierMethodUsecase,
    private readonly getSupplierMethodById: GetSupplierMethodByIdUsecase,
  ) {}

  @RequirePermissions("payment-methods.manage")
  @Post()
  create(@Body() dto: HttpSupplierMethodCreateDto) {
    return this.createSupplierMethod.execute(
      PaymentMethodHttpMapper.toCreateSupplierMethodInput(dto),
    );
  }

  @RequirePermissions("payment-methods.read")
  @Get("by-supplier/:supplierId")
  listBySupplier(@Param("supplierId", ParseUUIDPipe) supplierId: string) {
    return this.listSupplierMethods.execute({ supplierId });
  }

  @RequirePermissions("payment-methods.read")
  @Get(":supplierMethodId")
  getById(
    @Param("supplierMethodId", ParseUUIDPipe) supplierMethodId: string,
  ) {
    return this.getSupplierMethodById.execute({ supplierMethodId });
  }

  @RequirePermissions("payment-methods.manage")
  @Patch(":supplierMethodId")
  update(
    @Param("supplierMethodId", ParseUUIDPipe) supplierMethodId: string,
    @Body() dto: HttpSupplierMethodUpdateDto,
  ) {
    return this.updateSupplierMethod.execute(
      PaymentMethodHttpMapper.toUpdateSupplierMethodInput(supplierMethodId, dto),
    );
  }

  @RequirePermissions("payment-methods.manage")
  @Delete(":supplierMethodId")
  remove(
    @Param("supplierMethodId", ParseUUIDPipe) supplierMethodId: string,
  ) {
    return this.deleteSupplierMethod.execute({ supplierMethodId });
  }
}
