import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateSupplierUsecase } from "src/modules/suppliers/application/usecases/supplier/create.usecase";
import { UpdateSupplierUsecase } from "src/modules/suppliers/application/usecases/supplier/update.usecase";
import { SetSupplierActiveUsecase } from "src/modules/suppliers/application/usecases/supplier/set-active.usecase";
import { ListSuppliersUsecase } from "src/modules/suppliers/application/usecases/supplier/list.usecase";
import { GetSupplierUsecase } from "src/modules/suppliers/application/usecases/supplier/get-by-id.usecase";
import { HttpCreateSupplierDto } from "../dtos/supplier/http-supplier-create.dto";
import { HttpUpdateSupplierDto } from "../dtos/supplier/http-supplier-update.dto";
import { HttpSetSupplierActiveDto } from "../dtos/supplier/http-supplier-set-active.dto";
import { ListSupplierQueryDto } from "../dtos/supplier/http-supplier-list.dto";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

@Controller("suppliers")
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(
    private readonly createSupplier: CreateSupplierUsecase,
    private readonly updateSupplier: UpdateSupplierUsecase,
    private readonly setSupplierActive: SetSupplierActiveUsecase,
    private readonly listSuppliers: ListSuppliersUsecase,
    private readonly getSupplier: GetSupplierUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateSupplierDto) {
    return this.createSupplier.execute(dto);
  }

  @Get()
  list(@Query() query: ListSupplierQueryDto) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";
    return this.listSuppliers.execute({
      page: query.page,
      limit: query.limit,
      isActive,
      documentType: query.documentType as SupplierDocType | undefined,
      documentNumber: query.documentNumber,
      name: query.name,
      lastName: query.lastName,
      tradeName: query.tradeName,
      phone: query.phone,
      email: query.email,
      q: query.q,
    });
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getSupplier.execute({ supplierId: id });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateSupplierDto) {
    return this.updateSupplier.execute({ supplierId: id, ...dto });
  }

  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetSupplierActiveDto) {
    return this.setSupplierActive.execute({ supplierId: id, isActive: dto.isActive });
  }
}
