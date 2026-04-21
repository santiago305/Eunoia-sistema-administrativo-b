import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { SupplierHttpMapper } from "src/modules/suppliers/application/mappers/supplier-http.mapper";
import { CreateSupplierSkuUsecase } from "src/modules/suppliers/application/usecases/supplier-sku/create.usecase";
import { GetSupplierSkuUsecase } from "src/modules/suppliers/application/usecases/supplier-sku/get-by-id.usecase";
import { ListSupplierSkusUsecase } from "src/modules/suppliers/application/usecases/supplier-sku/list.usecase";
import { UpdateSupplierSkuUsecase } from "src/modules/suppliers/application/usecases/supplier-sku/update.usecase";
import { HttpCreateSupplierSkuDto } from "../dtos/supplier-sku/http-supplier-sku-create.dto";
import { ListSupplierSkuQueryDto } from "../dtos/supplier-sku/http-supplier-sku-list.dto";
import { HttpUpdateSupplierSkuDto } from "../dtos/supplier-sku/http-supplier-sku-update.dto";

@Controller("suppliers/skus")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class SupplierSkusController {
  constructor(
    private readonly createSupplierSku: CreateSupplierSkuUsecase,
    private readonly updateSupplierSku: UpdateSupplierSkuUsecase,
    private readonly getSupplierSku: GetSupplierSkuUsecase,
    private readonly listSupplierSkus: ListSupplierSkusUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateSupplierSkuDto) {
    return this.createSupplierSku.execute(SupplierHttpMapper.toCreateSupplierSkuInput(dto));
  }

  @Get("all")
  list(@Query() query: ListSupplierSkuQueryDto) {
    return this.listSupplierSkus.execute(
      SupplierHttpMapper.toListSupplierSkusInput({
        page: query.page,
        limit: query.limit,
        supplierId: query.supplierId,
        skuId: query.skuId,
        supplierSku: query.supplierSku,
      }),
    );
  }

  @Get(":supplierId/:skuId")
  getById(
    @Param("supplierId", ParseUUIDPipe) supplierId: string,
    @Param("skuId", ParseUUIDPipe) skuId: string,
  ) {
    return this.getSupplierSku.execute({ supplierId, skuId });
  }

  @Patch(":supplierId/:skuId")
  update(
    @Param("supplierId", ParseUUIDPipe) supplierId: string,
    @Param("skuId", ParseUUIDPipe) skuId: string,
    @Body() dto: HttpUpdateSupplierSkuDto,
  ) {
    return this.updateSupplierSku.execute(SupplierHttpMapper.toUpdateSupplierSkuInput(supplierId, skuId, dto));
  }
}
