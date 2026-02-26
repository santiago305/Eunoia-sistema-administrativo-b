import { Body, Controller, Get, InternalServerErrorException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CreateProduct } from 'src/modules/catalog/application/usecases/product/created.usecase';
import { UpdateProduct } from 'src/modules/catalog/application/usecases/product/update.usecase';
import { SetProductActive } from 'src/modules/catalog/application/usecases/product/set-active.usecase';
import { SearchProductsPaginated } from 'src/modules/catalog/application/usecases/product/search-paginated.usecase';
import { ListProductVariants } from 'src/modules/catalog/application/usecases/product-variant/list-by-product.usecase';
import { GetProductWithVariants } from 'src/modules/catalog/application/usecases/product/get-with-variants.usecase';
import { GetProductById } from 'src/modules/catalog/application/usecases/product/get-by-id.usecase';
import { CreateStockItemForProduct } from 'src/modules/inventory/application/use-cases/stock-item/create-for-product.usecase';
import { HttpCreateProductDto } from '../dtos/products/http-product-create.dto'
import { HttpUpdateProductDto } from '../dtos/products/http-product-update.dto'
import { HttpSetProductActiveDto } from '../dtos/products/http-product-set-active.dto'
import { ListProductQueryDto } from '../dtos/products/http-products-list.dto';
@Controller('catalog/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProduct,
    private readonly updateProduct: UpdateProduct,
    private readonly setActive: SetProductActive,
    private readonly search: SearchProductsPaginated,
    private readonly getById: GetProductById,
    private readonly listVariants: ListProductVariants,
    private readonly getWithVariants: GetProductWithVariants,
    private readonly createStockItemForProduct: CreateStockItemForProduct,

  ) {}

  @Post()
  async create(@Body() dto: HttpCreateProductDto) {
    const product = await this.createProduct.execute(dto);
    const productId = product.getId()?.value;
    if (!productId) {
      throw new InternalServerErrorException({
        type: 'error',
        message: 'No se pudo obtener el id del producto creado',
      });
    }
    return await this.createStockItemForProduct.execute({
      productId,
      isActive: product.getIsActive(),
    });
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: HttpUpdateProductDto) {
    return this.updateProduct.execute({ ...dto, id });
  }

  @Patch(':id/active')
  setActiveById(@Param('id', ParseUUIDPipe) id: string, @Body() dto: HttpSetProductActiveDto) {
    return this.setActive.execute({ id, isActive: dto.isActive });
  }

  @Get()
  list(@Query() query: ListProductQueryDto) {
    const isActived = query.isActive === undefined ? undefined : query.isActive === 'true';
    const q = query.q?.trim();

    return this.search.execute({
      isActive: isActived,
      name: query.name,
      description: query.description,
      sku: query.sku,
      barcode: query.barcode,
      type: query.type,
      q: q,
      page: query.page,
      limit: query.limit,
    });
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

