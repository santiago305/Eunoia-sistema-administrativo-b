import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateProductCatalogSku } from "src/modules/product-catalog/application/usecases/create-sku.usecase";
import { GetProductCatalogSku } from "src/modules/product-catalog/application/usecases/get-sku.usecase";
import { ListProductCatalogSkus } from "src/modules/product-catalog/application/usecases/list-skus.usecase";
import { UpdateProductCatalogSku } from "src/modules/product-catalog/application/usecases/update-sku.usecase";
import { CreateProductCatalogSkuDto } from "../dtos/create-sku.dto";
import { ListProductCatalogSkusDto } from "../dtos/list-skus.dto";
import { UpdateProductCatalogSkuDto } from "../dtos/update-sku.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class ProductCatalogSkuController {
  constructor(
    private readonly createSku: CreateProductCatalogSku,
    private readonly updateSku: UpdateProductCatalogSku,
    private readonly listSkus: ListProductCatalogSkus,
    private readonly getSku: GetProductCatalogSku,
  ) {}

  @Post("products/:id/skus")
  create(@Param("id", ParseUUIDPipe) productId: string, @Body() dto: CreateProductCatalogSkuDto) {
    return this.createSku.execute({ productId, ...dto });
  }

  @Get("skus")
  list(@Query() query: ListProductCatalogSkusDto) {
    return this.listSkus.execute({
      q: query.q,
      isActive: query.isActive === undefined ? undefined : query.isActive === "true",
      productId: query.productId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
    });
  }

  @Get("products/:id/skus")
  listByProduct(@Param("id", ParseUUIDPipe) productId: string, @Query() query: ListProductCatalogSkusDto) {
    return this.listSkus.execute({
      q: query.q,
      isActive: query.isActive === undefined ? undefined : query.isActive === "true",
      productId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
    });
  }

  @Get("skus/:id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getSku.execute(id);
  }

  @Patch("skus/:id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateProductCatalogSkuDto) {
    return this.updateSku.execute(id, dto);
  }
}
