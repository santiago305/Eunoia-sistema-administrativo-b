import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CreateProductEquivalence } from 'src/modules/catalog/application/usecases/product-equivalence/create.usecase';
import { DeleteProductEquivalence } from 'src/modules/catalog/application/usecases/product-equivalence/delete.usecase';
import { ListProductEquivalencesByVariant } from 'src/modules/catalog/application/usecases/product-equivalence/list-by-variant.usecase';
import { HttpCreateProductEquivalenceDto } from '../dtos/product-equivalences/http-product-equivalence-create.dto';
import { ListProductEquivalencesQueryDto } from '../dtos/product-equivalences/http-product-equivalence-list.dto';

@Controller('catalog/product-equivalences')
@UseGuards(JwtAuthGuard)
export class ProductEquivalencesController {
  constructor(
    private readonly createEquivalence: CreateProductEquivalence,
    private readonly deleteEquivalence: DeleteProductEquivalence,
    private readonly listByVariant: ListProductEquivalencesByVariant,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateProductEquivalenceDto) {
    return this.createEquivalence.execute(dto);
  }

  @Get()
  list(@Query() query: ListProductEquivalencesQueryDto) {
    return this.listByVariant.execute({ productId: query.productId });
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteEquivalence.execute(id);
  }
}
