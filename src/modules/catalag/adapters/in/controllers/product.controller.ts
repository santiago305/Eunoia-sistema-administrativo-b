import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CreateProduct } from 'src/modules/catalag/application/usecases/product/created.usecase';
import { UpdateProduct } from 'src/modules/catalag/application/usecases/product/update.usecase';
import { SetProductActive } from 'src/modules/catalag/application/usecases/product/set-active.usecase';
import { SearchProductsPaginated } from 'src/modules/catalag/application/usecases/product/search-paginated.usecase';
import { ListProductVariants } from 'src/modules/catalag/application/usecases/product-variant/list-by-product.usecase';
import { GetProductWithVariants } from 'src/modules/catalag/application/usecases/product/get-with-variants.usecase';
import { HttpCreateProductDto } from '../tdos/products/http-product-create.dto'
import { HttpUpdateProductDto } from '../tdos/products/http-product-update.dto'
import { HttpSetProductActiveDto } from '../tdos/products/http-product-set-active.dto'
import { ListProductQueryDto } from '../tdos/products/http-products-list.dto';
@Controller('catalog/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProduct,
    private readonly updateProduct: UpdateProduct,
    private readonly setActive: SetProductActive,
    private readonly search: SearchProductsPaginated,
    private readonly listVariants: ListProductVariants,
    private readonly getWithVariants: GetProductWithVariants,

  ) {}

  @Post()
  create(@Body() dto: HttpCreateProductDto) {
    return this.createProduct.execute(dto);
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
    return this.search.execute({
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
      name: query.name,
      description: query.description,
      page: query.page,
      limit: query.limit,
    });
  }


  @Get(':id/variants')
  getVariants(@Param('id', ParseUUIDPipe) id: string) {
    return this.listVariants.execute({ productId: id });
  }

  @Get(':id/with-variants')
  getProductWithVariants(@Param('id', ParseUUIDPipe) id: string) {
    return this.getWithVariants.execute({ id });
  }

}
