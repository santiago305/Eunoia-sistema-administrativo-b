import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CreateProduct } from 'src/modules/catalag/application/usecases/product/created.usecase';
import { UpdateProduct } from 'src/modules/catalag/application/usecases/product/update.usecase';
import { SetProductActive } from 'src/modules/catalag/application/usecases/product/set-active.usecase';
import { ListActiveProducts } from 'src/modules/catalag/application/usecases/product/list-active.usecase';
import { ListInactiveProducts } from 'src/modules/catalag/application/usecases/product/list-inactive.usecase';
import { CreateProductInput, UpdateProductInput, SetProductActiveInput } from 'src/modules/catalag/application/dto/inputs';
import { SearchProducts } from 'src/modules/catalag/application/usecases/product/search.usecase';

@Controller('catalog/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProduct,
    private readonly updateProduct: UpdateProduct,
    private readonly setActive: SetProductActive,
    private readonly listActive: ListActiveProducts,
    private readonly listInactive: ListInactiveProducts,
    private readonly search: SearchProducts,

  ) {}

  @Post()
  create(@Body() dto: CreateProductInput) {
    return this.createProduct.execute(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductInput) {
    return this.updateProduct.execute({ ...dto, id });
  }

  @Patch(':id/active')
  setActiveById(@Param('id') id: string, @Body() dto: SetProductActiveInput) {
    return this.setActive.execute({ id, isActive: dto.isActive });
  }

  @Get()
  list(
    @Query('isActive') isActive?: string,
    @Query('name') name?: string,
    @Query('description') description?: string,
  ) {
    if (name || description) {
      return this.search.execute({
        name,
        description,
      });
    }

    if (isActive === 'false') return this.listInactive.execute();
    return this.listActive.execute();
  }

}
