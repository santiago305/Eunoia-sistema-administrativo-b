import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateProductCatalogEquivalence } from "src/modules/product-catalog/application/usecases/create-equivalence.usecase";
import { DeleteProductCatalogEquivalence } from "src/modules/product-catalog/application/usecases/delete-equivalence.usecase";
import { GetProductCatalogEquivalence } from "src/modules/product-catalog/application/usecases/get-equivalence.usecase";
import { ListProductCatalogEquivalencesByProduct } from "src/modules/product-catalog/application/usecases/list-equivalences-by-product.usecase";
import { CreateProductCatalogEquivalenceDto } from "../dtos/create-equivalence.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class ProductCatalogEquivalenceController {
  constructor(
    private readonly createEquivalence: CreateProductCatalogEquivalence,
    private readonly deleteEquivalence: DeleteProductCatalogEquivalence,
    private readonly getEquivalence: GetProductCatalogEquivalence,
    private readonly listByProduct: ListProductCatalogEquivalencesByProduct,
  ) {}

  @Post("products/:id/equivalences")
  create(@Param("id", ParseUUIDPipe) productId: string, @Body() dto: CreateProductCatalogEquivalenceDto) {
    return this.createEquivalence.execute({ productId, ...dto });
  }

  @Get("products/:id/equivalences")
  list(@Param("id", ParseUUIDPipe) productId: string) {
    return this.listByProduct.execute(productId);
  }

  @Get("equivalences/:id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getEquivalence.execute(id);
  }

  @Delete("equivalences/:id")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.deleteEquivalence.execute(id);
  }
}
