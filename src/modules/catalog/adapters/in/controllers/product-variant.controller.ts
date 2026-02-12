import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CreateProductVariant } from 'src/modules/catalog/application/usecases/product-variant/create.usecase';
import { UpdateProductVariant } from 'src/modules/catalog/application/usecases/product-variant/update.usecase';
import { SetProductVariantActive } from 'src/modules/catalog/application/usecases/product-variant/set-active.usecase';
import { GetProductVariant } from 'src/modules/catalog/application/usecases/product-variant/get-element-by-id.usercase';
import { SearchProductVariants } from 'src/modules/catalog/application/usecases/product-variant/search.usecase';
import {HttpCreateProductVariantDto} from '../dtos/product-variants/http-variant-create.dto'
import {HttpUpdateProductVariantDto} from '../dtos/product-variants/http-variant-update.dto'
import {HttpSetProductVariantActiveDto} from '../dtos/product-variants/http-variant-set-active.dto'
import { ListProductVariantsInput } from 'src/modules/catalog/application/dto/product-variants/input/list-product-variant';
import { ListProductVariantsQueryDto } from '../dtos/product-variants/http-variant-list.dto'
@Controller('catalog/variants')
@UseGuards(JwtAuthGuard)
export class ProductVariantsController {
  constructor(
    private readonly createVariant: CreateProductVariant,
    private readonly updateVariant: UpdateProductVariant,
    private readonly setActive: SetProductVariantActive,
    private readonly getById: GetProductVariant,
    private readonly search: SearchProductVariants,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateProductVariantDto) {
    return this.createVariant.execute(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: HttpUpdateProductVariantDto) {
    return this.updateVariant.execute({ ...dto, id });
  }

  @Patch(':id/active')
  setActiveById(@Param('id', ParseUUIDPipe) id: string, @Body() dto: HttpSetProductVariantActiveDto) {
    return this.setActive.execute({ id, isActive: dto.isActive });
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.getById.execute({ id });
  }

  @Get()
  list(@Query() query: ListProductVariantsQueryDto) {
    const activeVal = query.isActive === undefined ? undefined : query.isActive === 'true';
    const dto: ListProductVariantsInput = {
      productId: query.productId,
      productName: query.productName,
      productDescription: query.productDescription,
      sku: query.sku,
      barcode: query.barcode,
      q: query.q,
      isActive: activeVal,
      limit: query.limit,
      page: query.page,
    };
    return this.search.execute(dto);
  }
}

