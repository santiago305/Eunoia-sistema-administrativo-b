import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CreateProductVariant } from 'src/modules/catalag/application/usecases/product-variant/create.usecase';
import { UpdateProductVariant } from 'src/modules/catalag/application/usecases/product-variant/update.usecase';
import { SetProductVariantActive } from 'src/modules/catalag/application/usecases/product-variant/set-active.usecase';
import { GetProductVariant } from 'src/modules/catalag/application/usecases/product-variant/get-element-by-id.usercase';
import { ListActiveProductVariants } from 'src/modules/catalag/application/usecases/product-variant/list-active.usecase';
import { ListInactiveProductVariants } from 'src/modules/catalag/application/usecases/product-variant/list-inactive.usecase';
import { SearchProductVariants } from 'src/modules/catalag/application/usecases/product-variant/search.usecase';
import {
  CreateProductVariantInput,
  UpdateProductVariantInput,
  SetProductVariantActiveInput,
  ListProductVariantsInput,
} from 'src/modules/catalag/application/dto/inputs';

@Controller('catalog/variants')
@UseGuards(JwtAuthGuard)
export class ProductVariantsController {
  constructor(
    private readonly createVariant: CreateProductVariant,
    private readonly updateVariant: UpdateProductVariant,
    private readonly setActive: SetProductVariantActive,
    private readonly getById: GetProductVariant,
    private readonly listActive: ListActiveProductVariants,
    private readonly listInactive: ListInactiveProductVariants,
    private readonly search: SearchProductVariants,
  ) {}

  @Post()
  create(@Body() dto: CreateProductVariantInput) {
    return this.createVariant.execute(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductVariantInput) {
    return this.updateVariant.execute({ ...dto, id });
  }

  @Patch(':id/active')
  setActiveById(@Param('id') id: string, @Body() dto: SetProductVariantActiveInput) {
    return this.setActive.execute({ id, isActive: dto.isActive });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getById.execute({ id });
  }

  @Get()
  list(@Query('productId') productId?: string, @Query('isActive') isActive?: string, @Query('sku') sku?: string, @Query('barcode') barcode?: string) {
    const dto: ListProductVariantsInput = {
      productId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      sku,
      barcode,
    };
    if (dto.isActive === true) {
      return this.listActive.execute(dto);
    }
    if (dto.isActive === false) {
      return this.listInactive.execute(dto);
    }
    if (dto.sku || dto.barcode || dto.productId) {
      return this.search.execute(dto);
    }
    return this.search.execute(dto);
  }
}
