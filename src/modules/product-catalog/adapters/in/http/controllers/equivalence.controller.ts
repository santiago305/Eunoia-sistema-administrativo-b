import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateProductCatalogEquivalence } from "src/modules/product-catalog/application/usecases/create-equivalence.usecase";
import { DeleteProductCatalogEquivalence } from "src/modules/product-catalog/application/usecases/delete-equivalence.usecase";
import { GetProductCatalogEquivalence } from "src/modules/product-catalog/application/usecases/get-equivalence.usecase";
import { ListProductCatalogEquivalencesByProduct } from "src/modules/product-catalog/application/usecases/list-equivalences-by-product.usecase";
import { CreateProductCatalogEquivalenceDto } from "../dtos/create-equivalence.dto";

@Controller()
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class ProductCatalogEquivalenceController {
  constructor(
    private readonly createEquivalence: CreateProductCatalogEquivalence,
    private readonly deleteEquivalence: DeleteProductCatalogEquivalence,
    private readonly getEquivalence: GetProductCatalogEquivalence,
    private readonly listByProduct: ListProductCatalogEquivalencesByProduct,
  ) {}

  @RequirePermissions("catalog.manage")
  @Post("products/:id/equivalences")
  create(@Param("id", ParseUUIDPipe) productId: string, @Body() dto: CreateProductCatalogEquivalenceDto) {
    return this.createEquivalence.execute({ productId, ...dto });
  }

  @RequirePermissions("catalog.read")
  @Get("products/:id/equivalences")
  list(@Param("id", ParseUUIDPipe) productId: string) {
    return this.listByProduct.execute(productId);
  }

  @RequirePermissions("catalog.read")
  @Get("equivalences/:id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getEquivalence.execute(id);
  }

  @RequirePermissions("catalog.manage")
  @Delete("equivalences/:id")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.deleteEquivalence.execute(id);
  }
}
