import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateSupplierMethodUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/create.usecase";
import { DeleteSupplierMethodUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/delete.usecase";
import { GetSupplierMethodByIdUsecase } from "src/modules/payment-methods/application/usecases/supplier-method/get-by-id.usecase";
import { HttpSupplierMethodCreateDto } from "../dtos/supplier-method/http-supplier-method-create.dto";

@Controller("supplier-methods")
@UseGuards(JwtAuthGuard)
export class SupplierMethodsController {
  constructor(
    private readonly createSupplierMethod: CreateSupplierMethodUsecase,
    private readonly deleteSupplierMethod: DeleteSupplierMethodUsecase,
    private readonly getSupplierMethodById: GetSupplierMethodByIdUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpSupplierMethodCreateDto) {
    return this.createSupplierMethod.execute(dto);
  }

  @Get(":supplierId/:methodId")
  getById(
    @Param("supplierId", ParseUUIDPipe) supplierId: string,
    @Param("methodId", ParseUUIDPipe) methodId: string,
  ) {
    return this.getSupplierMethodById.execute({ supplierId, methodId });
  }

  @Delete(":supplierId/:methodId")
  remove(
    @Param("supplierId", ParseUUIDPipe) supplierId: string,
    @Param("methodId", ParseUUIDPipe) methodId: string,
  ) {
    return this.deleteSupplierMethod.execute({ supplierId, methodId });
  }
}
