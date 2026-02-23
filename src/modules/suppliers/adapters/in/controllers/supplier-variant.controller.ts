import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateSupplierVariantUsecase } from "src/modules/suppliers/application/usecases/supplier-variant/create.usecase";
import { UpdateSupplierVariantUsecase } from "src/modules/suppliers/application/usecases/supplier-variant/update.usecase";
import { GetSupplierVariantUsecase } from "src/modules/suppliers/application/usecases/supplier-variant/get-by-id.usecase";
import { ListSupplierVariantsUsecase } from "src/modules/suppliers/application/usecases/supplier-variant/list.usecase";
import { HttpCreateSupplierVariantDto } from "../dtos/supplier-variant/http-supplier-variant-create.dto";
import { HttpUpdateSupplierVariantDto } from "../dtos/supplier-variant/http-supplier-variant-update.dto";
import { ListSupplierVariantQueryDto } from "../dtos/supplier-variant/http-supplier-variant-list.dto";

@Controller("suppliers/variants")
@UseGuards(JwtAuthGuard)
export class SupplierVariantsController {
  constructor(
    private readonly createSupplierVariant: CreateSupplierVariantUsecase,
    private readonly updateSupplierVariant: UpdateSupplierVariantUsecase,
    private readonly getSupplierVariant: GetSupplierVariantUsecase,
    private readonly listSupplierVariants: ListSupplierVariantsUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateSupplierVariantDto) {
    return this.createSupplierVariant.execute(dto);
  }

  @Get('all')
  list(@Query() query: ListSupplierVariantQueryDto) {
    return this.listSupplierVariants.execute({
      page: query.page,
      limit: query.limit,
      supplierId: query.supplierId,
      variantId: query.variantId,
      supplierSku: query.supplierSku,
    });
  }

  @Get(":supplierId/:variantId")
  getById(
    @Param("supplierId", ParseUUIDPipe) supplierId: string,
    @Param("variantId", ParseUUIDPipe) variantId: string,
  ) {
    return this.getSupplierVariant.execute({ supplierId, variantId });
  }

  @Patch(":supplierId/:variantId")
  update(
    @Param("supplierId", ParseUUIDPipe) supplierId: string,
    @Param("variantId", ParseUUIDPipe) variantId: string,
    @Body() dto: HttpUpdateSupplierVariantDto,
  ) {
    return this.updateSupplierVariant.execute({ supplierId, variantId, ...dto });
  }
}
