import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateSupplierMethodUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/create.usecase";
import { DeleteSupplierMethodUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/delete.usecase";
import { GetSupplierMethodByIdUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/get-by-id.usecase";
import { ListSupplierMethodsUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/list.usecase";
import { UpdateSupplierMethodUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/update.usecase";
import { HttpSupplierMethodCreateDto } from "../dtos/supplier-method/http-supplier-method-create.dto";
import { HttpSupplierMethodUpdateDto } from "../dtos/supplier-method/http-supplier-method-update.dto";
import { PaymentMethodHttpMapper } from "src/modules/payment-methods/application/mappers/payment-method-http.mapper";

@Controller("supplier-methods")
@UseGuards(JwtAuthGuard)
export class SupplierMethodsController {
  constructor(
    private readonly createSupplierMethod: CreateSupplierMethodUsecase,
    private readonly listSupplierMethods: ListSupplierMethodsUsecase,
    private readonly updateSupplierMethod: UpdateSupplierMethodUsecase,
    private readonly deleteSupplierMethod: DeleteSupplierMethodUsecase,
    private readonly getSupplierMethodById: GetSupplierMethodByIdUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpSupplierMethodCreateDto) {
    return this.createSupplierMethod.execute(
      PaymentMethodHttpMapper.toCreateSupplierMethodInput(dto),
    );
  }

  @Get("by-supplier/:supplierId")
  listBySupplier(@Param("supplierId", ParseUUIDPipe) supplierId: string) {
    return this.listSupplierMethods.execute({ supplierId });
  }

  @Get(":supplierMethodId")
  getById(
    @Param("supplierMethodId", ParseUUIDPipe) supplierMethodId: string,
  ) {
    return this.getSupplierMethodById.execute({ supplierMethodId });
  }

  @Patch(":supplierMethodId")
  update(
    @Param("supplierMethodId", ParseUUIDPipe) supplierMethodId: string,
    @Body() dto: HttpSupplierMethodUpdateDto,
  ) {
    return this.updateSupplierMethod.execute(
      PaymentMethodHttpMapper.toUpdateSupplierMethodInput(supplierMethodId, dto),
    );
  }

  @Delete(":supplierMethodId")
  remove(
    @Param("supplierMethodId", ParseUUIDPipe) supplierMethodId: string,
  ) {
    return this.deleteSupplierMethod.execute({ supplierMethodId });
  }
}
