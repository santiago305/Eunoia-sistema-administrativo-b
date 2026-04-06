import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CreateProduct } from 'src/modules/catalog/application/usecases/product/created.usecase';
import { UpdateProduct } from 'src/modules/catalog/application/usecases/product/update.usecase';
import { SetProductActive } from 'src/modules/catalog/application/usecases/product/set-active.usecase';
import { SearchProductsPaginated } from 'src/modules/catalog/application/usecases/product/search-paginated.usecase';
import { ListProductVariants } from 'src/modules/catalog/application/usecases/product-variant/list-by-product.usecase';
import { GetProductWithVariants } from 'src/modules/catalog/application/usecases/product/get-with-variants.usecase';
import { GetProductById } from 'src/modules/catalog/application/usecases/product/get-by-id.usecase';
import { ListFinishedActiveProducts } from 'src/modules/catalog/application/usecases/product/list-finished-active.usecase';
import { ListPrimaActiveProducts } from 'src/modules/catalog/application/usecases/product/list-prima-active.usecase';
import { HttpCreateProductDto } from '../dtos/products/http-product-create.dto'
import { HttpUpdateProductDto } from '../dtos/products/http-product-update.dto'
import { HttpSetProductActiveDto } from '../dtos/products/http-product-set-active.dto'
import { ListProductQueryDto } from '../dtos/products/http-products-list.dto';
import { ListRowMaterialProductVariants } from 'src/modules/catalog/application/usecases/product-variant/list-row-material.usecase';
import { ListFinishedWithRecipesProductVariants } from 'src/modules/catalog/application/usecases/product-variant/list-finished-with-recipes.usecase';
import { SearchRowMaterialProductVariants } from 'src/modules/catalog/application/usecases/product-variant/search-row-material.usecase';
import { CatalogHttpMapper } from 'src/modules/catalog/application/mappers/catalog-http.mapper';
@Controller('catalog/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProduct,
    private readonly updateProduct: UpdateProduct,
    private readonly setActive: SetProductActive,
    private readonly search: SearchProductsPaginated,
    private readonly getById: GetProductById,
    private readonly listFinishedActive: ListFinishedActiveProducts,
    private readonly listPrimaActive: ListPrimaActiveProducts,
    private readonly listVariants: ListProductVariants,
    private readonly getWithVariants: GetProductWithVariants,
    private readonly listRowMaterial: ListRowMaterialProductVariants,
    private readonly finishedWithRecipes: ListFinishedWithRecipesProductVariants,
    private readonly searchRowMaterial: SearchRowMaterialProductVariants,

  ) {}

  @Post()
  async create(@Body() dto: HttpCreateProductDto) {
    return await this.createProduct.execute(CatalogHttpMapper.toCreateProductInput(dto));
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: HttpUpdateProductDto) {
    return this.updateProduct.execute(CatalogHttpMapper.toUpdateProductInput(id, dto));
  }

  @Patch(':id/active')
  setActiveById(@Param('id', ParseUUIDPipe) id: string, @Body() dto: HttpSetProductActiveDto) {
    return this.setActive.execute(CatalogHttpMapper.toSetProductActiveInput(id, dto.isActive));
  }

  @Get()
  list(@Query() query: ListProductQueryDto) {
    const isActived = query.isActive === undefined ? undefined : query.isActive === 'true';
    return this.search.execute(CatalogHttpMapper.toListProductsInput({
      isActive: isActived,
      name: query.name,
      description: query.description,
      sku: query.sku,
      barcode: query.barcode,
      type: query.type,
      q: query.q,
      page: query.page,
      limit: query.limit,
    }));
  }

  @Get('finished/active')
  listFinishedActiveProducts() {
    return this.listFinishedActive.execute();
  }

  @Get('prima/active')
  listPrimaActiveProducts() {
    return this.listPrimaActive.execute();
  }
  
  @Get('variants/finished')
  listRowMaterialVariants() {
    const raw = false;
    return this.listRowMaterial.execute(raw);
  }

  @Get('variants/search')
  searchRowMaterialVariants(
    @Query('q') q: string,
    @Query('raw') raw?: string,
    @Query('withRecipes') withRecipes?: string,
  ) {
    const rawFlag = raw === undefined ? true : raw !== 'false';
    const withRecipesFlag = withRecipes === 'true';
    return this.searchRowMaterial.execute({ q, raw: rawFlag, withRecipes: withRecipesFlag });
  }

  @Get('variants/finished-with-recipes')
  listFinishedWithRecipes() {
    return this.finishedWithRecipes.execute();
  }

  @Get(':id/variants')
  getVariants(@Param('id', ParseUUIDPipe) id: string) {
    return this.listVariants.execute({ productId: id });
  }

  @Get('by-name/:name')
  getProductByName(@Param('name') name: string, @Query() query: ListProductQueryDto) {
    return this.search.execute({
      name: name?.trim(),
      sku: query.sku,
      barcode: query.barcode,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  @Get(':id')
  getProductById(@Param('id', ParseUUIDPipe) id: string) {
    return this.getById.execute({ id });
  }

  @Get(':id/with-variants')
  getProductWithVariants(@Param('id', ParseUUIDPipe) id: string) {
    return this.getWithVariants.execute({ id });
  }

}

